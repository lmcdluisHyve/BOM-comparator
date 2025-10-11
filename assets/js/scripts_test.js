$(document).ready(function () {
  let currentStep = 1; // Paso inicial
  const totalSteps = $(".step-content").length;

  // Mostrar solo el paso actual
  function showStep(step) {
    $(".step-content").hide();
    $(`.step-content[data-step='${step}']`).fadeIn();
    updateProgress(step);
    validarCamposPaso(step);
  }

  // Actualiza la barra de progreso
  function updateProgress(step) {
    const porcentaje = ((step - 1) / (totalSteps - 1)) * 100;
    $("#progressBar").css("width", porcentaje + "%");
  }

  // Validar todos los campos requeridos del paso actual
  function validarCamposPaso(step) {
    const $inputs = $(`.step-content[data-step='${step}']`)
      .find("input[required], select[required], textarea[required]");
    const $nextBtn = $("#nextBtn");

    let todosValidos = true;

    $inputs.each(function () {
      const $input = $(this);
      if (!validarCampo($input)) {
        todosValidos = false;
      }
    });

    $nextBtn.prop("disabled", !todosValidos);

    // Validación en tiempo real
    $inputs.off("input blur").on("input blur", function () {
      validarCampo($(this));
      const todosValidosAhora = $inputs.toArray().every((el) => validarCampo($(el)));
      $nextBtn.prop("disabled", !todosValidosAhora);
    });
  }

  // Validar individualmente un campo
  function validarCampo($input) {
    const tipo = $input.attr("type");
    const valor = $input.val()?.trim();
    let valido = true;

    if ($input.prop("required")) {
      if (tipo === "file") {
        valido = $input[0].files.length > 0;
      } else if (tipo === "email") {
        valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      } else {
        valido = valor !== "";
      }
    }

    if (valido) {
      $input.removeClass("is-invalid").addClass("is-valid");
    } else {
      $input.removeClass("is-valid").addClass("is-invalid");
    }

    return valido;
  }

  // Botón siguiente
  $("#nextBtn").on("click", function () {
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  });

  // Botón anterior
  $("#prevBtn").on("click", function () {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // Inicializar wizard
  showStep(currentStep);
});
