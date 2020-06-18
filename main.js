let templates = [];

const storageTemplateKey = "latestweb_templates";

function onStoreTemplateClicked()
{
    let svgContents = null;
    vex.dialog.confirm({
        unsafeMessage: `
            <div id='divstoretemplate'>
                Load SVG file <input id='loadsvgfile' type='file' accept='image/svg'>
            </div>`,
        callback: function(value)
        {
            if (!value)
                return;

            if (svgContents)
            {
                templates.push({"name": "testtemplate", "svgcontents": svgContents});
                localStorage[storageTemplateKey] = JSON.stringify(templates);
                updateTemplates();
            }
        }
    });
    $("#loadsvgfile").change((evt) => {
        let f = evt.target.files[0];
        let r = new FileReader();
        r.onload = (evt) => {
            let contents = evt.target.result;
            console.log(`Loaded ${contents.length} characters`);

            svgContents = contents;
        };
        r.readAsText(f);
    });
}

function updateTemplates()
{
    templates = [];
    $("#selecttemplate").empty();
    if (storageTemplateKey in localStorage)
        templates = JSON.parse(localStorage[storageTemplateKey]);

    let idx = 0;
    for (let t of templates)
        $("<option>").attr("value", "" + idx).text(t["name"]).appendTo("#selecttemplate");
}

function onTemplateSelectionChanged()
{
    let idx = parseInt($("#selecttemplate").val());
    console.log("Selection is now " + idx);

    $("#divsvg").empty();
    $("#divsvg").html(templates[idx]["svgcontents"]);
}

function onGeneratePDF()
{
    let idx = parseInt($("#selecttemplate").val());
    let svgText = templates[idx]["svgcontents"];

    let doc = new PDFDocument({ autoFirstPage: false});
    let scaleFactor = 72/96; // pdf points over css pixels
    doc.addPage({ size: [ $("#divsvg").width()*scaleFactor, $("#divsvg").height()*scaleFactor]})
    SVGtoPDF(doc, svgText, 0, 0, {});
    
    let stream = doc.pipe(blobStream());
    stream.on('finish', () => {
        
        let blob = stream.toBlob('application/pdf');
        console.log("Downloaded blob");
        console.log(blob);

        let url = URL.createObjectURL(blob);
        window.open(url);
    });
    doc.end();
}

function main()
{
    $("#storetemplate").click(onStoreTemplateClicked);
    $("#selecttemplate").change(onTemplateSelectionChanged);
    $("#generatepdf").click(onGeneratePDF);
    updateTemplates();
}

$(document).ready(main)