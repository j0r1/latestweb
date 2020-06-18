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
                templates.push({"name": "testtemplate", "svg": svgContents, "tex": "TODO"});
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
    {
        $("<option>").attr("value", "" + idx).text(t["name"]).appendTo("#selecttemplate");
        idx++;
    }
}

let testOptions = {
    fontSizeNameTeacher: "15",
    nameTeacher: "Mieke Gorissen",
    course: "Fysica",
    maximumPoints: "20",
    testTitle: "Moeilijke toets!",
    examPeriod: "Herfst",
    schoolYear: "2020-2021",
    footerText: "Wat tekst beneden",
    generatedHeaderFileName: null, // Automatically generated
}

function replace(s, obj)
{
    for (let key in obj)
    {
        let old = "${" + key + "}";
        s = s.split(old).join(obj[key]); // until replaceAll becomes available
    }
    return s;
}

function onTemplateSelectionChanged()
{
    let idx = parseInt($("#selecttemplate").val());
    console.log("Selection is now " + idx);

    $("#divsvg").empty();
    $("#divsvg").html(replace(templates[idx]["svg"], testOptions));
}

function onGeneratePDF()
{
    let idx = parseInt($("#selecttemplate").val());
    let svgText = templates[idx]["svg"];

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

function writeToLocalStorage()
{
    localStorage[storageTemplateKey] = JSON.stringify(templates);
}

function addToTemplates(name, svgFile, texFile)
{
    return new Promise((resolve, reject) => {
        $.ajax({ url: svgFile, 
                 converters: {
                    "text xml": true // Don't parse it
                 }}).then((svgResult) => {

            $.ajax(texFile).then((texResult) => {

                templates.push({"name": name, "svg": svgResult, "tex": texResult})
                writeToLocalStorage();
                updateTemplates();
                resolve();

            }).fail((err) => {
                reject(`Couldn't get ${texFile} using ajax:`);
                console.log(err);  
            })
        }).fail((err) => {
            reject(`Couldn't get ${svgFile} using ajax:`);
            console.log(err);
        })
    });
}

function getSelectedTemplates(optionValues, headerFileName)
{
    let idx = parseInt($("#selecttemplate").val());
    optionValues = JSON.parse(JSON.stringify(optionValues)); // create copy
    optionValues.generatedHeaderFileName = headerFileName;
    
    let svg = replace(templates[idx]["svg"], optionValues);
    let tex = replace(templates[idx]["tex"], optionValues);

    return [ svg, tex ];
}

function generatePDF(svgText)
{
    let doc = new PDFDocument({ autoFirstPage: false});
    let scaleFactor = 72/96; // pdf points over css pixels
    $("#divsvg").html(svgText);
    doc.addPage({ size: [ $("#divsvg").width()*scaleFactor, $("#divsvg").height()*scaleFactor]})
    SVGtoPDF(doc, svgText, 0, 0, {});
    
    return new Promise((resolve, reject) => {
        let stream = doc.pipe(blobStream());
        stream.on('finish', () => {
        
            let blob = stream.toBlob('application/pdf');
            resolve(blob);
        });
        doc.end();
    });
    
}

function onDownloadZip()
{
    let headerFileName = "testfilename.pdf";
    let texFileName = "testtexfile.tex";
    let outputFileName = "testzip.zip";

    let [svgText, texText ] = getSelectedTemplates(testOptions, headerFileName);
    generatePDF(svgText).then((blob) => {
        let zip = new JSZip();
        zip.file(texFileName, texText);
        zip.file(headerFileName, blob);
        zip.generateAsync({type:"blob"}).then((content) => {
            saveAs(content, outputFileName);
        });
    });
}

function main()
{
    $("#storetemplate").click(onStoreTemplateClicked);
    $("#selecttemplate").change(onTemplateSelectionChanged);
    $("#generatepdf").click(onGeneratePDF);
    $("#downloadzip").click(onDownloadZip);
    updateTemplates();

    if (templates.length == 0)
    {
        let dlg = vex.dialog.open({
            unsafeMessage: `Loading...`,
            callback: (value) => {
                console.log("Closed...");
            }
        })

        let errFunction = (err) => {
            console.log("Error: ", err);
        }

        addToTemplates("Examen", "exam-header-template.svg", "exam-template.tex").then(() => {
            addToTemplates("Toets", "test-header-template.svg", "test-template.tex").then(() => {
                dlg.close();
            }).catch(errFunction);
        }).catch(errFunction);
    }
}

$(document).ready(main)