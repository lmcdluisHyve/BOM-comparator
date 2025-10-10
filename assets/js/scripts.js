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
      datosExcel = rango.map((fila) => ({
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
    };

    lector.readAsArrayBuffer(archivo);
  });

  $.getJSON("data/tabs.json")
    .done(function (data) {
      let navHtml = "";
      let contentHtml = "";

      $.each(data, function (i, tab) {
        const activeClass = i === 0 ? "active" : "";
        const showClass = i === 0 ? "show active" : "";

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

        contentHtml += `
          <div class="tab-pane fade ${showClass}" id="${tab.id}" role="tabpanel"
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

      const $firstTab = $("#viewTab a[data-bs-toggle='tab']").first();
      const firstUrl = $firstTab.data("url");
      const $firstPane = $($firstTab.data("bs-target"));

      if (firstUrl) {
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
            $firstPane.data("loaded", true);
          }
        });
      }

      $("#viewTab a[data-bs-toggle='tab']").on("shown.bs.tab", function (e) {
        const $targetPane = $($(e.target).data("bs-target"));
        const url = $(e.target).data("url");

        if (url && !$targetPane.data("loaded")) {
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

  let $currentStep = 1;

  function initWizard() {
    const totalSteps = $(".step").length;

    showStep($currentStep);

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

    // -------------------------
    // EVENTO NEXT
    // -------------------------
    $("#nextBtn")
      .off("click")
      .on("click", function () {
        const inputs = $(`.step-content[data-step='${$currentStep}']`).find(
          ":input[required]"
        );
        for (let i = 0; i < inputs.length; i++) {
          if (!inputs[i].checkValidity()) {
            inputs[i].reportValidity();
            return;
          }
        }

        if ($currentStep < totalSteps) {
          $currentStep++;
          if ($currentStep === totalSteps) {
            const data = $("#wizardForm").serializeArray();
            let html = "<ul class='list-group'>";
            data.forEach(
              (f) =>
                (html += `<li class='list-group-item'><strong>${f.name}:</strong> ${f.value}</li>`)
            );
            html += "</ul>";
            $("#resumen").html(html);
          }
          showStep($currentStep);
        } else {
          alert("✅ Formulario enviado correctamente");
          $("#wizardForm")[0].reset();
          $currentStep = 1;
          showStep($currentStep);
        }
      });

    // -------------------------
    // EVENTO PREV CON LIMPIEZA LOCALSTORAGE
    // -------------------------
    $("#prevBtn")
      .off("click")
      .on("click", function () {
        // Limpiar solo si estamos en el step 2
        if ($currentStep === 2) {
          localStorage.removeItem("dataWithCategory");
          console.log(
            "Step 2 detectado: limpiando localStorage...",
            localStorage.getItem("dataWithCategory")
          );
          dataCombined = [];
          $("#fileName").text("Ningun archivo seleccionado");
        }

        // Retroceder el wizard
        if ($currentStep > 1) {
          $currentStep--;
          showStep($currentStep);
        }
      });
  }

  $("#viewTabContent").load("/components/tabs/assetFile.html", function () {
    initWizard();

    let excelData = [];

    const $fileName = $("#fileName");
    const $dropZone = $("#dropZone");

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

    $(document).on("change", "#fileInput1", function () {
      const file = this.files[0];
      if (file) {
        $fileName.text(`📄 ${file.name}`);
        handleFile(file);
      } else {
        $fileName.text("Ningún archivo seleccionado");
      }
    });

    function handleFile(file) {
      const reader = new FileReader();
      $fileName.text(`📄 ${file.name}`);

      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];

        excelData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        localStorage.setItem("excelData", JSON.stringify(excelData));
      };

      reader.readAsArrayBuffer(file);
    }

    // -------------------------
    // STEP 2: RENDERIZAR TABLA CON CATEGORY
    // -------------------------
    function initStep2() {
      const $table = $("#mappedTable");
      const storedData = JSON.parse(localStorage.getItem("excelData")) || [];

      if (storedData.length === 0) {
        console.log("data en memoria", storedData);
        $table.html(
          `<tr><td><div class="empty text-center my-5">
        <div class="empty-icon"><i class="bi bi-emoji-frown fs-4"></i></div>
        <h4>No se encontró ningún dato asociado</h4>
        <p class="empty-subtitle text-secondary">Intenta cargar un archivo Excel en el paso anterior.</p>
      </div></td></tr>`
        );
        return;
      }

      const columnasDeseadas = [
        "Loc",
        "Sub Loc",
        "Comp S/N",
        "Asset_Tag",
        "MAC0",
        "Component PN",
        "Category",
      ];

      // Ordenar datos
      const orderFirst = { columna: "Loc", descenting: true };
      const orderSecond = { columna: "Sub Loc", descenting: true };
      function orderByFields(a, b) {
        const valA1 = a[orderFirst.columna] ?? "";
        const valB1 = b[orderFirst.columna] ?? "";
        const numA1 = parseFloat(valA1),
          numB1 = parseFloat(valB1);
        const esNumA1 = !isNaN(numA1) && valA1 !== "";
        const esNumB1 = !isNaN(numB1) && valB1 !== "";
        if (valA1 !== valB1) {
          if (esNumA1 && esNumB1)
            return orderFirst.descenting ? numB1 - numA1 : numA1 - numB1;
          else
            return orderFirst.descenting
              ? valB1.toString().localeCompare(valA1.toString())
              : valA1.toString().localeCompare(valB1.toString());
        }
        const valA2 = a[orderSecond.columna] ?? "";
        const valB2 = b[orderSecond.columna] ?? "";
        const numA2 = parseFloat(valA2),
          numB2 = parseFloat(valB2);
        const esNumA2 = !isNaN(numA2) && valA2 !== "";
        const esNumB2 = !isNaN(numB2) && valB2 !== "";
        if (esNumA2 && esNumB2)
          return orderSecond.descenting ? numB2 - numA2 : numA2 - numB2;
        else
          return orderSecond.descenting
            ? valB2.toString().localeCompare(valA2.toString())
            : valA2.toString().localeCompare(valB2.toString());
      }

      const dataOrdered = [...storedData].sort(orderByFields);

      // Cargar JSON con categorías
      $.getJSON("/data/partNumbers.json")
        .done(function (arrayToFind) {
          function cleanString(str) {
            return (str || "")
              .toString()
              .normalize("NFKD")
              .replace(/[\s'"`]+/g, "") // elimina espacios y comillas
              .replace(/[\u200B-\u200D\uFEFF]/g, "") // caracteres invisibles
              .toLowerCase();
          }

          // Combinar datos con categoría
          const dataCombined = dataOrdered.map((itemOrigin) => {
            const valueToFind = cleanString(itemOrigin["Component PN"]);

            const foundValue = arrayToFind.find((itemToFind) => {
              const pnTag = cleanString(itemToFind["PN Tag"]);
              return pnTag === valueToFind;
            });
            return {
              ...itemOrigin,
              Category: foundValue ? foundValue["Category"] : "Not found",
            };
          });

          // Renderizar tabla
          let html = "<thead><tr>";
          columnasDeseadas.forEach((col) => (html += `<th>${col}</th>`));
          html += "</tr></thead><tbody>";

          dataCombined.forEach((row) => {
            html += "<tr>";
            columnasDeseadas.forEach(
              (col) => (html += `<td>${row[col] ?? ""}</td>`)
            );
            html += "</tr>";
          });

          html += "</tbody>";
          $table.html(html);

          insertDataHeader(dataCombined);
          localStorage.setItem(
            "dataWithCategory",
            JSON.stringify(dataCombined)
          );

          function insertDataHeader(data) {
            $("#atRackLabel, #atRackLabelInternal").html(
              `<i class="bi bi-tag me-2"></i> ${data[0]["Sys AT"] ?? ""}`
            );
            $("#totalComponents, #totalComponentsLabel").text(data.length);
            $("#projectName").text(data[0]["Project"]);
          }
        })
        .fail(function (jqxhr, textStatus, error) {
          console.error("❌ Error cargando JSON:", textStatus, error);
        });
    }

    $("#nextBtn").on("click", function () {
      initStep2();
    });
  });

  $(document).on("click", "#actionToScanBtn", function () {
    renderScanForm();
  });

  /* ================= utilidades de normalización/comparación ================= */
  function normalizeValue(val, fieldKey) {
    if (val === null || val === undefined) return "";
    let s = String(val).trim();

    // Detectar MAC por la clave (MAC, mac, MAC0, etc.)
    if (/mac/i.test(fieldKey)) {
      // eliminar todo lo que no sea hex y devolver en minúsculas
      return s.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
    }

    // Normalizar acentos y convertir a minúsculas para comparaciones de texto
    s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return s.toLowerCase();
  }

  function valuesEqual(orig, current, key) {
    const o = normalizeValue(orig, key);
    const c = normalizeValue(current, key);

    // Si ambos vacíos -> OK
    if (o === "" && c === "") return true;

    // Si ambos parecen numéricos -> comparar numéricamente
    const numO = parseFloat(o);
    const numC = parseFloat(c);
    if (!isNaN(numO) && !isNaN(numC) && String(numO) === String(numC))
      return true;

    // Comparación estricta de strings ya normalizados
    return o === c;
  }

  /* ========================= render + validación ============================ */
  function renderScanForm() {
    console.log("🟢 renderScanForm(): generando formularios...");

    const $scanDataFormRow = $("#scanDataFormRow");
    $scanDataFormRow.empty();

    const stored = localStorage.getItem("dataWithCategory");
    if (!stored) {
      $scanDataFormRow.html(`
      <div class="alert alert-warning text-center w-100">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No se encontró información en localStorage (dataWithCategory).
      </div>
    `);
      return;
    }

    const data = JSON.parse(stored);
    if (!Array.isArray(data) || data.length === 0) {
      $scanDataFormRow.html(`
      <div class="alert alert-warning text-center w-100">
        No hay registros para renderizar.
      </div>
    `);
      return;
    }

    // campos fijos (solo estos se mostrarán)
    const fields = ["Asset_Tag", "Comp S/N", "MAC0"];

    data.forEach((record, index) => {
      console.log(record)
      // bloque por registro
      const $formBlock = $(`
      <div class="rounded p-3 mb-4 bg-white shadow-sm border-start border-primary border-5">
        <h6 class="text-primary mb-3"><i class="bi bi-cpu me-2"></i> Posicion # ${record["Loc"]} - Sub Loc ${record["Sub Loc"]}<span class="ms-2 badge bg-success bg-text-white rounded-pill text-uppercase">${record["Category"]}</span></h6>
        <div class="row" id="formFields_${index}"></div>
      </div>
    `);

      const $fieldsContainer = $formBlock.find(`#formFields_${index}`);

      fields.forEach((key) => {
        const originalValue = record[key] ?? "";
        // crear id "seguro" (sin espacios ni caracteres inválidos)
        const safeKey = key.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
        const inputId = `${safeKey}_${index}`;

        const isEmpty = originalValue === null || originalValue === "";

        // elemento de input; guardamos data-field (clave real), data-index, data-original
        const $field = $(`
        <div class="col-md-4">
          <div class="form-floating mb-3">
            <input
              type="text"
              class="form-control ${isEmpty ? "bg-light text-muted" : ""}"
              id="${inputId}"
              name="${safeKey}_${index}"
              placeholder="${key}"
              ${isEmpty ? "readonly" : ""}
              data-field="${key}"
              data-index="${index}"
              data-original="${originalValue || ""}"
            />
            <label for="${inputId}">${key}</label>
            <small class="invalid-feedback"></small>
          </div>
        </div>
      `);

        // adjuntar evento live validation
        $field.find("input").on("input blur change", function () {
          validateSingleInput($(this));
        });

        $fieldsContainer.append($field);
      });

      $scanDataFormRow.append($formBlock);
    });

    // botón de envío (uno solo, al final)
    $scanDataFormRow.append(`
    <div class="col-12 text-end mt-3">
      <button type="submit" class="btn btn-success">
        <i class="bi bi-check-circle me-2"></i>Enviar
      </button>
    </div>
  `);

    // submit: validar todos los inputs editables contra el original
    $("#scanDataForm")
      .off("submit")
      .on("submit", function (e) {
        e.preventDefault();

        const $editableInputs = $(this).find("input:not([readonly])");
        const mismatches = [];

        $editableInputs.each(function () {
          const $inp = $(this);
          const ok = validateSingleInput($inp);
          if (!ok) {
            mismatches.push({
              index: $inp.data("index"),
              field: $inp.data("field"),
              expected: $inp.data("original"),
              got: $inp.val(),
            });
          }
        });

        if (mismatches.length) {
          // mostrar resumen y enfocar el primer error
          let mensaje = "❌ Hay diferencias con los datos originales:\n\n";
          mismatches.forEach((m) => {
            mensaje += `Registro ${m.index + 1} - ${m.field}\n  Esperado: "${
              m.expected
            }"\n  Ingresado: "${m.got}"\n\n`;
          });
          alert(mensaje);
          const $firstInvalid = $(this).find(".is-invalid").first();
          if ($firstInvalid.length) $firstInvalid.focus();
          return;
        }

        // si todo ok: serializar y hacer lo que necesites (ej: enviar, actualizar localStorage, etc.)
        const formData = $(this).serializeArray();
        console.log("✅ Envío OK. formData:", formData);
        alert(
          "✅ Todos los valores coinciden con la tabla original. Enviado correctamente."
        );
      });

    console.log(
      `✅ Renderizados ${data.length} bloque(s) con ${fields.length} campos cada uno.`
    );
  }

  // Detecta cuando un input recibe texto (escaneo)
$("#scanDataForm").on("input", "input", function() {
  const $this = $(this);

  // Espera un poco (el escáner escribe muy rápido)
  clearTimeout($this.data("scan-timeout"));
  const timeout = setTimeout(() => {
    // Solo avanzar si el campo tiene algo y no es readonly
    if ($this.val().trim() !== "" && !$this.prop("readonly")) {
      const $inputs = $("#scanDataForm input:not([readonly])");
      const currentIndex = $inputs.index($this);
      const nextIndex = (currentIndex + 1) % $inputs.length;
      $inputs.eq(nextIndex).focus().select();
    }
  }, 150); // 150ms es suficiente para la mayoría de los escáneres

  $this.data("scan-timeout", timeout);
});


  // Detectar Tab en cualquier input dentro del formulario
$("#scanDataForm").on("keydown", "input", function(e) {
  if (e.key === "Tab") {
    e.preventDefault();

    const $inputs = $("#scanDataForm input:not([readonly])");
    const currentIndex = $inputs.index(this);
    let nextIndex;

    if (e.shiftKey) {
      nextIndex = (currentIndex - 1 + $inputs.length) % $inputs.length;
    } else {
      nextIndex = (currentIndex + 1) % $inputs.length;
    }

    $inputs.eq(nextIndex).focus();
  }
});



  /* ================= validación de un input ================= */
  function validateSingleInput($input) {
    const key = $input.data("field");
    const original = $input.data("original") ?? "";
    const current = $input.val() ?? "";

    const ok = valuesEqual(original, current, key);

    // Ajustar clases de Bootstrap
    if (ok) {
      $input.removeClass("is-invalid").addClass("is-valid");
      $input.closest(".form-floating").find(".invalid-feedback").text("");
    } else {
      $input.removeClass("is-valid").addClass("is-invalid");
      const expectedDisplay = original === "" ? "(vacío)" : String(original);
      $input
        .closest(".form-floating")
        .find(".invalid-feedback")
        .text(`Valor esperado: "${expectedDisplay}"`);
    }

    // ✅ actualizar conteos por bloque y globales
    updateBlockCounters();
    updateGlobalCounters();

    return ok;
  }

  /* ================= actualizar contadores por bloque ================= */
  function updateBlockCounters() {
    $(".component-block").each(function () {
      const $block = $(this);
      const inputs = $block.find("input:not([readonly])");
      const correct = inputs.filter(".is-valid").length;
      const incorrect = inputs.filter(".is-invalid").length;
      const pending = inputs.length - correct - incorrect;

      $block.find(".block-correct").text(correct);
      $block.find(".block-pending").text(incorrect + pending);
    });
  }

  /* ================= actualizar contadores globales ================= */
  function updateGlobalCounters() {
    const totalInputs = $("#scanDataForm input:not([readonly])").length;
    const totalCorrectos = $(
      "#scanDataForm input.is-valid:not([readonly])"
    ).length;
    const totalErrores = $(
      "#scanDataForm input.is-invalid:not([readonly])"
    ).length;
    const totalPendientes = totalInputs - totalCorrectos - totalErrores;

    $("#totalComponentsScanned").text(totalCorrectos);
    $("#pendingComponents").text(totalErrores + totalPendientes);
  }

  function renderFinalSummary() {
  const $tbody = $("#validationSummary");
  $tbody.empty();

  let totalCorrect = 0;
  let totalError = 0;

  $(".component-block").each(function(i) {
    const block = $(this);
    const fields = {};
    block.find("input").each(function() {
      const key = $(this).data("field");
      fields[key] = $(this).val();
    });

    const correct = block.find("input.is-invalid").length === 0;
    const statusBadge = correct
      ? `<span class="badge bg-success">OK</span>`
      : `<span class="badge bg-danger">Error</span>`;

    if (correct) totalCorrect++;
    else totalError++;

    $tbody.append(`
      <tr>
        <td>${i + 1}</td>
        <td>${fields["Asset_Tag"] || "-"}</td>
        <td>${fields["Comp S/N"] || "-"}</td>
        <td>${fields["MAC0"] || "-"}</td>
        <td>${statusBadge}</td>
      </tr>
    `);
  });

  $("#totalComponentsScannedFinal").text(totalCorrect);
  $("#pendingComponentsFinal").text(totalError);
}

// ================== Exportar XLSX ==================
$("#exportSummaryBtn").off("click").on("click", function() {
  const data = [];
  $("#validationSummary tr").each(function() {
    const row = [];
    $(this).find("td").each(function() {
      row.push($(this).text());
    });
    if(row.length) data.push(row);
  });

  if (!data.length) {
    alert("No hay datos para exportar.");
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet([["#", "Asset Tag", "Comp S/N", "MAC0", "Estado"], ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resumen");
  XLSX.writeFile(wb, "ResumenComponentes.xlsx");
});

// ================== Botón volver a editar ==================
$("#goBackToEdit").off("click").on("click", function() {
  // ejemplo: retroceder al step 2 del wizard
  $currentStep = 2;
  showStep($currentStep);
});

// ================== Botón finalizar ==================
$("#confirmFinish").off("click").on("click", function() {
  alert("✅ Proceso finalizado correctamente.");
  // Aquí podrías limpiar el wizard, guardar datos en DB, etc.
});

});
