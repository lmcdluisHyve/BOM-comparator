$(document).ready(function () {
  $("#btnImportar").click(function () {
    let archivo = $("#excelFile")[0].files[0];
    if (!archivo) {
      alert("Por favor selecciona un archivo Excel.");
      return;
    }

    let rangoUsuario = $("#excelRange").val().trim();
    let rangoFinal = rangoUsuario !== "" ? rangoUsuario : rangoDefault;

    let lector = new FileReader();
    lector.onload = function (e) {
      let datos = new Uint8Array(e.target.result);
      let workbook = XLSX.read(datos, { type: "array" });

      // Tomar la primera hoja
      let primeraHoja = workbook.SheetNames[0];
      let hoja = workbook.Sheets[primeraHoja];

      // Usar el rango dinámico (o default)
      let rango = XLSX.utils.sheet_to_json(hoja, {
        range: rangoFinal,
        header: 1,
      });

      // Convertir a objeto
      datosExcel = rango.map((fila, i) => ({
        Columna1: fila[0],
        Columna2: fila[1],
        Columna3: fila[2],
      }));

      // Mostrar resultado en un dialog
      $("#output").text(JSON.stringify(datosExcel, null, 2));
      $("#dialog").dialog({
        modal: true,
        width: 500,
        buttons: {
          Cerrar: function () {
            $(this).dialog("close");
          },
        },
      });

      // console.log("Objeto JS guardado en datosExcel:", datosExcel);
      // console.log("Rango usado:", rangoFinal);
    };

    lector.readAsArrayBuffer(archivo);
  });

  // console.log("Iniciando carga de tabs.json...");

  $.getJSON("data/tabs.json")
    .done(function (data) {
      // console.log("✅ JSON cargado correctamente:", data);

      let navHtml = "";
      let contentHtml = "";

      $.each(data, function (i, tab) {
        const activeClass = i === 0 ? "active" : "";
        const showClass = i === 0 ? "show active" : "";

        // Crear tabs dinámicos
        navHtml += `
              <li class="nav-item" role="presentation">
                <a class="nav-link ${activeClass}" id="${tab.id}Tab"
                   data-bs-toggle="tab" data-bs-target="#${tab.id}"
                   type="button" role="tab" aria-controls="${
                     tab.id
                   }" aria-selected="${i === 0}"
                   data-url="${tab.url}">
                   <i class="${tab.icon} me-2"></i>${tab.title}
                </a>
              </li>`;

        // Panel vacío
        contentHtml += `
              <div class="tab-pane fade ${showClass}" id="${
          tab.id
        }" role="tabpanel"
                   aria-labelledby="${tab.id}Tab">
                ${
                  i === 0
                    ? "<p class='text-muted'>Cargando...</p>"
                    : "<p class='text-muted'>Haz clic para cargar contenido...</p>"
                }
              </div>`;
      });

      $("#viewTab").html(navHtml);
      $("#viewTabContent").html(contentHtml);

      // Cargar primer tab automáticamente
      const $firstTab = $("#viewTab a[data-bs-toggle='tab']").first();
      const firstUrl = $firstTab.data("url");
      const $firstPane = $($firstTab.data("bs-target"));

      if (firstUrl) {
        // console.log("Cargando primer tab desde:", firstUrl);
        $firstPane.load(firstUrl, function (response, status, xhr) {
          if (status === "error") {
            console.error(
              "❌ Error cargando primer tab:",
              xhr.status,
              xhr.statusText
            );
            $firstPane.html(
              "<p class='text-danger'>Error cargando: " + xhr.status + "</p>"
            );
          } else {
            // console.log("✅ Primer tab cargado correctamente.");
            $firstPane.data("loaded", true);
          }
        });
      }

      // Cargar contenido bajo demanda al hacer clic en un tab
      $("#viewTab a[data-bs-toggle='tab']").on("shown.bs.tab", function (e) {
        const $targetPane = $($(e.target).data("bs-target"));
        const url = $(e.target).data("url");

        if (url && !$targetPane.data("loaded")) {
          console.log("Cargando tab desde:", url);
          $targetPane.html("<p class='text-muted'>Cargando...</p>");

          $targetPane.load(url, function (response, status, xhr) {
            if (status === "error") {
              console.error(
                "❌ Error cargando",
                url,
                ":",
                xhr.status,
                xhr.statusText
              );
              $targetPane.html(
                "<p class='text-danger'>Error cargando: " + xhr.status + "</p>"
              );
            } else {
              // console.log("✅ Tab cargado correctamente:", url);
              $targetPane.data("loaded", true);
            }
          });
        }
      });
    })
    .fail(function (jqxhr, textStatus, error) {
      console.error("❌ Error cargando tabs.json:", textStatus, error);
      alert("Error cargando tabs.json: " + textStatus + " - " + error);
    });

  function initWizard() {
    let currentStep = 1;
    const totalSteps = $(".step").length;

    showStep(currentStep);

    function updateProgress(step) {
      const percent = ((step - 1) / (totalSteps - 1)) * 100;
      $("#progressBar").css("width", percent + "%");
      $("#progressSteps").css("width", percent + "%"); // si usas barra animada
    }

    function showStep(step) {
      $(".step-content").removeClass("active").hide();
      $(`.step-content[data-step='${step}']`).fadeIn(200).addClass("active");

      $(".step")
        .removeClass("active completed")
        .each(function () {
          const s = $(this).data("step");
          if (s < step) $(this).addClass("completed");
          else if (s === step) $(this).addClass("active");
        });

      updateProgress(step);

      $("#prevBtn").toggle(step > 1);
      $("#nextBtn").text(step === totalSteps ? "Finalizar" : "Siguiente");
    }

    $("#nextBtn")
      .off("click")
      .on("click", function () {
        const inputs = $(`.step-content[data-step='${currentStep}']`).find(
          ":input[required]"
        );
        for (let i = 0; i < inputs.length; i++) {
          if (!inputs[i].checkValidity()) {
            inputs[i].reportValidity();
            return;
          }
        }

        if (currentStep < totalSteps) {
          currentStep++;
          if (currentStep === totalSteps) {
            const data = $("#wizardForm").serializeArray();
            let html = "<ul class='list-group'>";
            data.forEach(
              (f) =>
                (html += `<li class='list-group-item'><strong>${f.name}:</strong> ${f.value}</li>`)
            );
            html += "</ul>";
            $("#resumen").html(html);
          }
          showStep(currentStep);
        } else {
          alert("✅ Formulario enviado correctamente");
          $("#wizardForm")[0].reset();
          currentStep = 1;
          showStep(currentStep);
        }
      });

    $("#prevBtn")
      .off("click")
      .on("click", function () {
        if (currentStep > 1) {
          currentStep--;
          showStep(currentStep);
        }
      });
  }

  $("#viewTabContent").load(
    "/components/tabs/assetFile.html",
    function (response, status, xhr) {
      initWizard(); // Inicializa el wizard solo cuando el HTML existe

      let excelData = []; // 🔹 Variable global disponible para otros steps

      const $fileInput = $("#excelFile");
      const $fileName = $("#fileName");
      const $dropZone = $("#dropZone");
      const $btnSelect = $("#btnSelect");

      // Arrastrar y soltar archivo
      $dropZone
        .on("dragover", function (e) {
          e.preventDefault();
          $(this).addClass("border-primary");
        })
        .on("dragleave", function () {
          $(this).removeClass("border-primary");
        })
        .on("drop", function (e) {
          e.preventDefault();
          $(this).removeClass("border-primary");
          const file = e.originalEvent.dataTransfer.files[0];
          if (file) handleFile(file);
        });

      // Botón para abrir selector de archivo
      $(document).on("click", "#btnSelect", function (e) {
        e.preventDefault();
        const $wrapper = $(this).closest("file-input-container");
        const $fileInput = $wrapper.find(".file-input");
        if ($fileInput.length === 0) {
          console.error("No se encontró el input de archivo.");
          return;
        }
        $fileInput.click();
      });

      // Selección normal de archivo
      $(document).on("change", "#fileInput1", function (e) {
        const file = this.files[0];
        if (file) {
          $fileName.text(`📄 ${file.name}`); // muestra el nombre
          handleFile(file); // aquí llamas a tu función
        } else {
          $fileName.text("Ningún archivo seleccionado");
        }
      });

      // Leer el archivo Excel y guardarlo
      function handleFile(files) {
        const reader = new FileReader();
        $fileName.text(`📄 ${files.name}`);

        reader.onload = function (e) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // Tomar la primera hoja
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];

          // Convertir el Excel a JSON
          excelData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          // Guardar en sessionStorage para acceder en otros steps del wizard
          sessionStorage.setItem("excelData", JSON.stringify(excelData));
        };

        reader.readAsArrayBuffer(files);
      }

      if ("step-content[data-step='2']") {
        // -------------------------
        // STEP 2: RENDERIZAR SOLO COLUMNAS DEFINIDAS
        // -------------------------
        function initStep2() {
          // 🔹 Tabla donde se pintarán los resultados
          const $table = $("#mappedTable");

          // 🔹 Datos del Excel guardados en sessionStorage
          const storedData =
            JSON.parse(sessionStorage.getItem("excelData")) || [];

          if (storedData.length === 0) {
            $table.html(
              `<tr><td><div class="empty text-center my-5">
  <div class="empty-icon">
    <i class="bi bi-emoji-frown fs-4"></i>
  </div>
  <h4>No se encontro ningun dato asociado</h4>
  <p class="empty-subtitle text-secondary">
    Intenta cargar un archivo Excel en el paso anterior.
  </p>
</div></td></tr>`
            );
            return;
          }

          // 🔹 Columnas que quieres mostrar
          const columnasDeseadas = [
            "Loc",
            "Sub Loc",
            "Comp S/N",
            "Asset_Tag",
            "MAC0",
            "Component PN",
            "Category",
          ];

          // 🔹 Configuración de orden
          const orderFirst = { columna: "Loc", descenting: true };
          const orderSecond = { columna: "Sub Loc", descenting: true };

          function orderByFields(a, b) {
            const valA1 = a[orderFirst.columna] ?? "";
            const valB1 = b[orderFirst.columna] ?? "";

            const numA1 = parseFloat(valA1);
            const numB1 = parseFloat(valB1);
            const esNumA1 = !isNaN(numA1) && valA1 !== "";
            const esNumB1 = !isNaN(numB1) && valB1 !== "";

            if (valA1 !== valB1) {
              if (esNumA1 && esNumB1) {
                return orderFirst.descenting ? numB1 - numA1 : numA1 - numB1;
              } else {
                return orderFirst.descenting
                  ? valB1.toString().localeCompare(valA1.toString())
                  : valA1.toString().localeCompare(valB1.toString());
              }
            }

            const valA2 = a[orderSecond.columna] ?? "";
            const valB2 = b[orderSecond.columna] ?? "";
            const numA2 = parseFloat(valA2);
            const numB2 = parseFloat(valB2);
            const esNumA2 = !isNaN(numA2) && valA2 !== "";
            const esNumB2 = !isNaN(numB2) && valB2 !== "";

            if (esNumA2 && esNumB2) {
              return orderSecond.descenting ? numB2 - numA2 : numA2 - numB2;
            } else {
              return orderSecond.descenting
                ? valB2.toString().localeCompare(valA2.toString())
                : valA2.toString().localeCompare(valB2.toString());
            }
          }

          // 🔹 Ordenamos los datos del Excel
          const dataOrdered = [...storedData].sort(orderByFields);

          // 🔹 Cargamos JSON externo con categorías
          $.getJSON("/data/partNumbers.json")
            .done(function (data) {
              const excelDataOnline = data;

              // 🔹 Combinar dataOrdered con categorías
              const dataWithCategory = dataOrdered.map((row) => {
                console.log('Buscando categoría para:', String(row["Component PN"]).trim());
                const match = excelDataOnline.find((item) => {
                  console.log('Comparando con:', String(item["PN Tag"]).trim());
                  // compara Component PN de dataOrdered con PN Tag de excelDataOnline
                  // return String(row["Component PN"]).trim() === String(item["PN Tag"]).trim();
                    // String(row["Component PN"]).trim() ===
                    // String(item["PN Tag"]).trim()
                });

                return {
                  ...row,
                  Category: match ? match["Category"] : "N/A",
                };
              });

              console.log("Data combinada:", dataWithCategory);
              // 🔹 Renderizar tabla
              let html = "<thead><tr>";
              columnasDeseadas.forEach((col) => {
                html += `<th>${col}</th>`;
              });
              html += "</tr></thead><tbody>";

              dataWithCategory.forEach((row) => {
                html += "<tr>";
                columnasDeseadas.forEach((col) => {
                  html += `<td>${row[col] ?? ""}</td>`;
                });
                html += "</tr>";
              });

              html += "</tbody>";
              $table.html(html);

              // 🔹 Guardar data combinada en sessionStorage
              sessionStorage.setItem(
                "dataWithCategory",
                JSON.stringify(dataOrdered)
              );
            })
            .fail(function (jqxhr, textStatus, error) {
              console.error("❌ Error cargando JSON:", textStatus, error);
            });
        }
        initStep2();
      } // end if ("step-content[data-step='2']")
    }
  ); // Close the .load callback function properly
}); // Close document.ready
