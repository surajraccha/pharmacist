let http = require('http');
let express = require('express');
let fs = require('fs');
let io = require('socket.io');
var bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

dotenv.config();

let app = express();
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));
app.use(express.static(`${__dirname}/html`));
let server = http.createServer(app);

io = io(server);

let opts = {
    port: process.env.PORT || 4002,
    baseDir: process.cwd()
};

//Configuration for Multer
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "html");
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `test.${ext}`);
    },
});

// Multer Filter
const multerFilter = (req, file, cb) => {
    if (file.mimetype.split("/")[1] === "html") {
        cb(null, true);
    } else {
        cb(new Error("Not a html File!!"), false);
    }
};

//Calling the "multer" Function
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

app.use(express.static(opts.baseDir));

app.get("/admin", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    let stream = fs.createReadStream(opts.baseDir + '/html/admin.html');
    stream.on('error', error => {
        res.write('<style>body{font-family: sans-serif;}</style><h2>reveal.js multiplex server.</h2><a href="/token">Generate token</a>');
        res.end();
    });
    stream.on('open', () => {
        stream.pipe(res);
    });
});

app.get("/:userId", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    console.log(req.params.userId);
    let stream = fs.createReadStream(opts.baseDir + '/html/presentation.html');
    stream.on('error', error => {
        res.write('<style>body{font-family: sans-serif;}</style><h2>reveal.js multiplex server.</h2><a href="/token">Generate token</a>');
        res.end();
    });
    stream.on('open', () => {
        stream.pipe(res);
    });
});

app.get("/", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    let stream = fs.createReadStream(opts.baseDir + '/html/presentation2.html');
    stream.on('error', error => {
        res.write('<style>body{font-family: sans-serif;}</style><h2>Please Check URL ,userId is not present.</h2>');
        res.end();
    });
    stream.on('open', () => {
        stream.pipe(res);
    });
});



app.get("/token", (req, res) => {
    let ts = new Date().getTime();
    let rand = Math.floor(Math.random() * 9999999);
    let secret = ts.toString() + rand.toString();
    res.send({ secret: secret, socketId: createHash(secret) });
});


app.post("/login", (req, res) => {
    let status, code;

    if (!req.body) {
        status = "Request failed";
        code = 404;
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
        return res.send({ message: status, code: code });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        status = "Incomplete credentials";
        code = 400;
    } else {
        const data = fs.readFileSync('credentials.json', 'utf8');
        const utf8EncodedData = Buffer.from(data, 'utf-8');
        const loginCredentials = JSON.parse(utf8EncodedData);

        if (email !== loginCredentials.username) {
            status = "Incorrect Email";
            code = 101;
        } else if (password !== loginCredentials.password) {
            status = "Incorrect Password";
            code = 102;
        } else {
            status = "Login Successful";
            code = 200;
        }
    }

    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ message: status, code: code });
});

app.post('/upload_file', upload.single('file'), async function (req, res) {
    try {
        if (!processFile()) {
            throw "Wrong HTML Uploaded! Please Upload Correct HTML.";
        } else {
            res.status(200).json({
                status: "success",
                message: "File created successfully!!",
                code: 200
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error,
            code: 500
        });
    }

});

// Actually listen
server.listen(opts.port || null);

function processFile() {
    const data = fs.readFileSync(opts.baseDir + '/html/test.html', 'utf8');
    const root = new JSDOM(data);
    var document = root.window.document;

    if (!document.body.classList.contains("reveal-viewport")) return false;

    if (document.getElementsByClassName("reveal") == undefined || document.getElementsByClassName("reveal").length == 0) return false;

    if (document.getElementsByClassName("slides") == undefined || document.getElementsByClassName("slides").length == 0) return false;


    function createElementAndAppend(elementType, attributesMap, parentElement) {
        const element = document.createElement(elementType);
        // Set attributes based on the provided map
        for (const [attribute, value] of Object.entries(attributesMap)) {
            element.setAttribute(attribute, value);
        }
        // Append the element to the specified parent
        parentElement.appendChild(element);
    }

    function setAttributesById(elementId, attributeName, functionName) {
        const elementList = document.querySelectorAll(`#${elementId}`);
        if (elementList && elementList.length > 0) {
            elementList.forEach(element => {
                element.setAttribute(attributeName, functionName);
            });
        }
    }

    // Head script elements
    createElementAndAppend('script', { 'src': 'https://code.jquery.com/jquery-3.5.0.js' }, document.head);
    createElementAndAppend('script', { 'src': 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js' }, document.head);
    createElementAndAppend('script', { 'src': 'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.31/moment-timezone-with-data.min.js' }, document.head);

    createElementAndAppend('script', {
        'src': 'https://assets.calendly.com/assets/external/widget.js'
    }, document.head);
    createElementAndAppend('script', {
        'src': 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
        'integrity': 'sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fF32wOl1i8ftdMhssTrF/OhyGWwonTcXA==',
        'crossorigin': 'anonymous'
    }, document.head);

    // Head Link elements
    createElementAndAppend('link', {
        'rel': 'stylesheet',
        'href': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.1.0/css/font-awesome.min.css'
    }, document.head);
    createElementAndAppend('link', {
        'rel': 'stylesheet',
        'href': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css'
    }, document.head);

    createElementAndAppend('link', {
        'rel': 'stylesheet',
        'href': 'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css'
    }, document.head);

    createElementAndAppend('link', {
        'rel': 'shortcut icon',
        'href': 'ASD_Logo.png',
        'type': 'image/x-icon'
    }, document.head);

    document.body.lastElementChild.remove();
    document.body.innerHTML += getPopUpHtml();

    // body script elements
    // createElementAndAppend('script', {
    //     'src': '/socket.io/socket.io.js'
    // }, document.body);

    createElementAndAppend('script', {
        'src': './../index.js'
    }, document.body);

    // Inject the custom alert box code into the head of the HTML
    const customAlertCode = `
        <style>
        body {
            font-family: Arial, sans-serif;
        }

        #custom-alert {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            z-index: 1;
        }

        #custom-alert h2 {
            margin-top: 0;
        }

        #custom-alert .close-btn {
            cursor: pointer;
            float: right;
            font-weight: bold;
        }
        </style>
        `;

    document.head.innerHTML += customAlertCode;
    document.body.innerHTML += `
        <div id="custom-alert">
            <span class="close-btn" onclick="closeAlert()">X</span>
            <h1>Error</h1>
            <h3 id="alert-message"></h3>
        </div>`;


    setAttributesById('new_patient', 'onclick', 'openNewPatient()');
    setAttributesById('personal_information', 'onclick', 'openPersonalInformation()');
    setAttributesById('calendly_reschedule', 'onclick', "openCalendly('reschedule')");
    setAttributesById('calendly_cancel', 'onclick', "openCalendly('cancel')");

    fs.writeFileSync(opts.baseDir + '/html/presentation.html', root.serialize(), 'utf-8');
    return true;
}

function getPopUpHtml() {
    return `
    <div class="custom-popup" id="customPopup" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background-color: rgb(90 81 81 / 50%); display: none; z-index: 1000; align-items: center; justify-content: center;">
        <div style="background-color: #fff; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="font-size: 18px;">Do you want to remove the information from the fields and start over?</p>
            <button onclick="resetFields()" style="font-size: 16px; padding: 10px 20px; margin-right: 10px; background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Yes</button>
            <button onclick="closeCustomPopup()" style="font-size: 16px; padding: 10px 20px; background-color: #f44336; color: #fff; border: none; border-radius: 5px; cursor: pointer;">No</button>
        </div>
    </div>
    `;
}


console.log("reveal.js: Multiplex running on port " + opts.port);