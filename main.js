let templates = [];

const storageKey = "latestweb_options";

function updateTemplates()
{
    $("#selecttemplate").empty();

    let idx = 0;
    for (let t of templates)
    {
        $("<option>").attr("value", "" + idx).text(t["name"]).appendTo("#selecttemplate");
        idx++;
    }

    onTemplateSelectionChanged();
}

let testOptions = {
    fontSizeNameTeacher: "15",
    nameTeacher: "Mieke Gorissen",
    weight: "80",
    date: "no time like the present",
    class: "First class",
    course: "Fysica",
    maximumPoints: "20",
    testTitle: "Moeilijke toets!",
    examPeriod: "Herfst",
    footerText: "Wat tekst beneden",
    headerFileName: "",
    texFileName: "",
    zipFileName: "",
}

function setTestOptions()
{
    $("#optnameteacherfontsize").val("" + testOptions.fontSizeNameTeacher);
    $("#optnameteacher").val(testOptions.nameTeacher);
    $("#optnamecourse").val(testOptions.course);
    $("#optmaxpoints").val("" + testOptions.maximumPoints);
    $("#optweight").val("" + testOptions.weight);
    $("#optdate").val(testOptions.date);
    $("#optclass").val(testOptions.class);
    $("#opttesttitle").val(testOptions.testTitle);
    $("#optperiodname").val(testOptions.examPeriod);
    $("#optfooter").val(testOptions.footerText);
    $("#headerfilename").val(testOptions.headerFileName);
    $("#texfilename").val(testOptions.texFileName);
    $("#zipfilename").val(testOptions.zipFileName);
}

function fetchTestOptions()
{
    testOptions.fontSizeNameTeacher = parseInt($("#optnameteacherfontsize").val());
    testOptions.nameTeacher = $("#optnameteacher").val();
    testOptions.course = $("#optnamecourse").val();
    testOptions.maximumPoints = parseInt($("#optmaxpoints").val());
    testOptions.weight = parseInt($("#optweight").val());
    testOptions.date = $("#optdate").val();
    testOptions.class = $("#optclass").val();
    testOptions.testTitle = $("#opttesttitle").val();
    testOptions.examPeriod = $("#optperiodname").val();
    testOptions.footerText = $("#optfooter").val();
    testOptions.headerFileName = $("#headerfilename").val();
    testOptions.texFileName = $("#texfilename").val();
    testOptions.zipFileName = $("#zipfilename").val();
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

    fetchTestOptions();
    $("#divsvg").empty();
    $("#divsvg").html(replace(templates[idx]["svg"], testOptions));
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

function getSelectedTemplates()
{
    let idx = parseInt($("#selecttemplate").val());
    
    let svg = replace(templates[idx]["svg"], testOptions);
    let tex = replace(templates[idx]["tex"], testOptions);

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
    fetchTestOptions();
    let [svgText, texText ] = getSelectedTemplates();
    generatePDF(svgText).then((blob) => {
        let zip = new JSZip();
        zip.file(testOptions.texFileName, texText);
        zip.file(testOptions.headerFileName, blob);
        zip.generateAsync({type:"blob"}).then((content) => {
            saveAs(content, testOptions.zipFileName);
        });
    });
}

function main()
{
    $("#selecttemplate").change(onTemplateSelectionChanged);
    $("#downloadzip").click(onDownloadZip);

    if (storageKey in localStorage)
    {
        testOptions = JSON.parse(localStorage[storageKey]);
        setTestOptions();
    }

    let syncFunction = () => {
        console.log("Syncing...");
        fetchTestOptions();
        onTemplateSelectionChanged(); // redraw
        localStorage[storageKey] = JSON.stringify(testOptions);
    }

    for (let e of [
            "optnameteacher",
            "optnameteacherfontsize",
            "optnamecourse",
            "optmaxpoints",
            "optweight",
            "optdate",
            "optclass",
            "opttesttitle",
            "optperiodname",
            "optfooter",
            "texfilename",
            "headerfilename",
            "zipfilename"
             ])
    {
        $("#" + e).change(syncFunction).on("input", syncFunction);
    }

    let dlg = vex.dialog.open({
        unsafeMessage: `Loading...`,
        callback: (value) => {
            console.log("Closed...");
        }
    })

    let errFunction = (err) => {
        console.log("Error: ", err);
    }

    addToTemplates("Examen", "exam-psd-template-2021.svg", "exam-template.tex").then(() => {
        addToTemplates("Toets", "test-psd-template-2021.svg", "test-template.tex").then(() => {
            dlg.close();
        }).catch(errFunction);
    }).catch(errFunction);
}

$(document).ready(main)
