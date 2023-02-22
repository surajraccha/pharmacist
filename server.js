let http = require('http');
let express = require('express');
let fs = require('fs');
let io = require('socket.io');
let crypto = require('crypto');
var bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var CryptoJS = require("crypto-js");

dotenv.config();
let app = express();

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));
console.log("__dirname>>"+__dirname);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));
app.use(express.static(`${__dirname}/html`));

let server = http.createServer(app);
let loginCredentials = {
    "username": "ryan@christiansentechsolutions.com",
    "password": "Ryan@CTS"
};
let domainDetails = {};

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


io.on('connection', socket => {
    socket.on('multiplex-statechanged', data => {
        if (typeof data.secret == 'undefined' || data.secret == null || data.secret === '') return;
        if (createHash(data.secret) === data.socketId) {
            data.secret = null;
            var domainObject = domainDetails[data.domain] || {};
            domainObject["currentSlideState"] = data.state;
            domainDetails[data.domain] = domainObject;
            socket.broadcast.emit(data.socketId, data);
        };
    });

    socket.on('fetch-data', (data, callback) => {
        if (domainDetails.hasOwnProperty(data.domain)) {
            callback({
                data: domainDetails[data.domain]["placeholders"],
                currentSlideState: domainDetails[data.domain]["currentSlideState"],
                domainSecurity : domainDetails[data.domain]["domainSecurity"],
                token: domainDetails[data.domain]["token"],
                status: true
            })
        } else {
            callback({
                status: false
            })
        }
        socket.broadcast.emit('master-refresh', data);
    });
});

app.use(express.static(opts.baseDir));

app.get("/", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    console.log(opts.baseDir);
    let stream = fs.createReadStream(opts.baseDir + '/html/presentation.html');
    stream.on('error', error => {
        res.write('<style>body{font-family: sans-serif;}</style><h2>reveal.js multiplex server.</h2><a href="/token">Generate token</a>');
        res.end();
    });
    stream.on('open', () => {
        stream.pipe(res);
    });
});

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

app.get("/token", (req, res) => {
    let ts = new Date().getTime();
    let rand = Math.floor(Math.random() * 9999999);
    let secret = ts.toString() + rand.toString();
    res.send({ secret: secret, socketId: createHash(secret) });
});


app.post("/navigate-slide", (req, res) => {
    var data = req.body;

    if (typeof data.slide == 'undefined' || data.slide == null || data.slide === '') return res.status(400).send({ message: 'error with slide number!' });

    if (typeof data.domain == 'undefined' || data.domain == null || data.domain === '') return res.status(400).send({ message: 'error with domain assigned to agent!' });

    data.domain = data.domain.replace('https://', '').replace("www.","");
    data.domain = data.domain.replace('.com', '');

    var indexh = null;

    if(domainDetails[data.domain] && domainDetails[data.domain]["currentSlideState"])
     indexh = parseInt(domainDetails[data.domain]["currentSlideState"]["indexh"]);
    console.log("indexh>>",indexh);
    switch(data.slide){
        case "next": indexh = indexh+1;
            break;
        case "previous": indexh = indexh > 0  ? indexh-1 : indexh;
        break;
        default :
          indexh = parseInt(data.slide)-1;
    }

    data.state = {
        indexh: indexh != null ? indexh : 1,
        indexv: 0,
        overview: false,
        paused: false
    };

    var domainObject = domainDetails[data.domain] || {};
    console.log("test>>>",Object.keys(domainObject));
    console.log("test2>>"+Object.keys(domainDetails[data.domain]));
    domainObject["currentSlideState"] = data.state;
    domainObject["placeholders"] = data.placeholders;
    console.log("secured>>",data.secured);
    if(data.secured === true){
      domainObject["domainSecurity"] = data.secured; 
    }else if(data.secured === false){
        domainObject["domainSecurity"] = data.secured; 
    }
    domainObject["orderId"] = data.orderId;
    domainObject["token"] = CryptoJS.AES.encrypt(data.orderId,data.domain).toString();
    domainDetails[data.domain] = domainObject;
    console.table(domainDetails);
    if(domainDetails[data.domain] && domainDetails[data.domain].hasOwnProperty("domainSecurity")){
        data.domainSecurity = domainDetails[data.domain]["domainSecurity"];
    }
    data.token = domainObject["token"];
    io.emit('change-slide', data);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ status: 'ok', state: data.state });
});


app.post('/start-stop-presentation', (req, res) => {
    var data = req.body;
    data.state = {
        indexh: 0,
        indexv: 0,
        overview: false,
        paused: false
    };

    if (typeof data.status == 'undefined' || data.status == null || data.status === '') return res.status(400).send({ message: 'error with presentation status!' });
    if (typeof data.domain == 'undefined' || data.domain == null || data.domain === '') return res.status(400).send({ message: 'error with domain assigned to agent!' });

    data.domain = data.domain.replace('https://', '').replace("www.","");
    data.domain = data.domain.replace('.com', '');
    console.log("domain>>", data.domain);

    if(data.orderId && domainDetails[data.domain] && domainDetails[data.domain]["orderId"] && data.orderId != domainDetails[data.domain]["orderId"]){
        delete domainDetails[data.domain];
    }
    var domainObject =domainDetails[data.domain]|| {};
    if(data.secured){
        domainObject["domainSecurity"] = data.secured; 
        data["domainSecurity"] =  data.secured;
      }else {
        domainObject["domainSecurity"] = false;
        data["domainSecurity"] =  false;
      } 
    domainObject["currentSlideState"] = data.state;
    domainObject["placeholders"] = data.placeholders;
    domainObject["token"] = CryptoJS.AES.encrypt(data.orderId,data.domain).toString();
    domainObject["orderId"] = data.orderId;
    domainDetails[data.domain] = domainObject;
    data.token = domainObject["token"];
    
    if (data.status === 'start') {
        console.log("inside start");
        io.emit('change-slide', data);
    } else {
        delete domainDetails[data.domain];
        console.log("inside stop");
        io.emit('disconnect-client', data);
    }
    console.table(domainDetails);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ status: 'ok' });
});

app.post("/login", (req, res) => {
    var status = null, code = null;
    if (req.body) {
        var email = req.body.email;
        var password = req.body.password;
        if (email && password) {
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
    } else {
        status = "request failed";
        code = 404;
    }
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ message: status, code: code });
});

app.post('/upload_file', upload.single('file'), async function (req, res) {
    const title = req.body.title;
    const file = req.file;

    console.log(title);
    console.log(file);
    
    try {
        if(!processFile()){
            throw "Wrong HTML Uploaded! Please Upload Correct HTML."; 
        }else{
            res.status(200).json({
                status: "success",
                message: "File created successfully!!",
                code:200
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error,
            code:500
        });
    }

});

let createHash = secret => {
    let cipher = crypto.createCipher('blowfish', secret);
    return cipher.final('hex');
};

// Actually listen
server.listen(opts.port || null);

 function processFile(){
        var element = '';
        const data = fs.readFileSync(opts.baseDir + '/html/test.html', 'utf8');
        const root = new JSDOM(data);
        var document = root.window.document;
        console.log("test>>",document.body.classList.contains("reveal-viewport"));
        console.log(document.getElementsByClassName("reveal")[0]);

        console.log(document.getElementsByClassName("slides")[0]);

        if(!document.body.classList.contains("reveal-viewport")) return false;
        
        if(document.getElementsByClassName("reveal") == undefined || document.getElementsByClassName("reveal").length == 0) return false;
        
        if(document.getElementsByClassName("slides") == undefined ||  document.getElementsByClassName("slides").length == 0) return false;

       element = document.createElement("script");
       element.setAttribute('src','https://code.jquery.com/jquery-3.5.0.js');
       document.head.appendChild(element);
      

       element = document.createElement("script");
       element.setAttribute('src','https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
       element.setAttribute('integrity',"sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fF32wOl1i8ftdMhssTrF/OhyGWwonTcXA==");
       element.setAttribute('crossorigin',"anonymous");
       element.setAttribute('referrerpolicy',"no-referrer");
       document.head.appendChild(element);

       element = document.createElement("link");
       element.setAttribute('rel',"stylesheet");
       element.setAttribute('href',"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.1.0/css/font-awesome.min.css");
       document.head.appendChild(element);

       element = document.createElement("link");
       element.setAttribute('rel',"stylesheet");
       element.setAttribute('href',"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css");
       document.head.appendChild(element);

       element= document.createElement("link");
       element.setAttribute('rel',"stylesheet");
       element.setAttribute('href',"https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css");
       document.head.appendChild(element);

       element= document.createElement("link");
       element.setAttribute('rel',"shortcut icon");
       element.setAttribute('href',"ASD_Logo.png");
       element.setAttribute('type',"image/x-icon");
       document.head.appendChild(element);

       document.body.lastElementChild.remove();

       element= document.createElement("script");
       element.setAttribute('src',"/socket.io/socket.io.js");
       document.body.appendChild(element);
       
       element= document.createElement("script");
       element.setAttribute('src',"./../index.js");
       document.body.appendChild(element);

       element = document.getElementsByClassName("password")[0];

       if(element == undefined || element == null)
          return false;
        
       element.setAttribute("onkeypress","return onlyNumberKey(event)");

       fs.writeFileSync(opts.baseDir + '/html/presentation.html', root.serialize() , 'utf-8');

       return true;
 }
  

let brown = '\033[33m',
    green = '\033[32m',
    reset = '\033[0m';

console.log(brown + "reveal.js:" + reset + " Multiplex running on port " + green + opts.port + reset);