$(document).ready(function(){
    $("#importExcelbutton").click(function(){
        let archivo = $("#importExcelInput")[0].files[0];
        if(!archivo){
            alert("Por favor seleccionar un archivo válido de Excel");
            return;
        }
    });

    let lector = new FileReader();
    lector.onload = function(e){
        let datos = new Uint8Array(e.target.result);
        let workbook = XLSX.read(datos, {type: 'array'});

        let primeraHoja = workbook.SheetNames[0];
        let hoja = workbook.Sheets[primeraHoja];

        let rango = XLSX.utils.decode_range(hoja[hoja, {
            range: "A11:S1000",
            header: 1
        }]);

        datosExcel = rango.map((fila, i) => ({
            Columna1: fila[0],
            Columna2: fila[1],
            Columna3: fila[2],
        }));

        $("#output").text(JSON.stringify(datosExcel, null, 2));
        $("#dialog").dialog({
            modal: true,
            width: 600,
            buttons:{
                "Cerrar": function(){
                    $(this).dialog("close");
                }
            }
        });

        alert("Objeto js guardado en datosExcel", datosExcel);
    };

    lector.readAsArrayBuffer(archivo);
});