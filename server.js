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
const htmlParser = require('node-html-parser');
var CryptoJS = require("crypto-js");

dotenv.config();
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));
app.use(express.static(`${__dirname}/html`));

let server = http.createServer(app);
let loginCredentials = {
    "username": "suraj@christiansentechsolutions.com",
    "password": "Suraj@CTS"
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
        cb(null, `index.${ext}`);
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
            domainDetails[data.domain] = {"currentSlideState":data.state};
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

    //data.domain = 'localhost';
    var domainObject = domainDetails[data.domain] || {};
    
    domainObject["currentSlideState"] = data.state;
    domainObject["placeholders"] = data.placeholders;
   // console.log("data.secured>>>",data.secured);
    if(data.secured){
      domainObject["domainSecurity"] = data.secured; 
    }else if(domainDetails[data.domain] && !domainDetails[data.domain].hasOwnProperty("domainSecurity")){
        domainDetails[data.domain]["domainSecurity"] = false;
    } 
    domainObject["token"] = CryptoJS.AES.encrypt(data.orderId,data.domain).toString();

  //  console.log(data.orderId,data.domain, domainObject["token"]);
    domainDetails[data.domain] = domainObject;

    if(domainDetails[data.domain] && domainDetails[data.domain].hasOwnProperty("domainSecurity")){
        data.domainSecurity = domainDetails[data.domain]["domainSecurity"];
    }
    data.token = domainObject["token"];
    console.log('navigate-slide>>>domainDetails>>>domainSecurity>>>>', domainDetails[data.domain]["domainSecurity"]);
    // console.log('navigate-slide>>>domainDetails>>>', domainDetails[data.domain]);
    io.emit('change-slide', data);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ status: 'ok', state: data.state });
});


app.post('/start-stop-presentation', (req, res) => {
    //console.log("req>>>", req);
    var data = req.body;
   // console.log("data>>>", data);
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
 //   console.log("domain>>", data.domain);
    var domainObject =  domainDetails[data.domain] || {};
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
    //console.log('start-stop-presentation>>>domainDetails>>>domainSecurity>>>>', domainDetails[data.domain]["domainSecurity"]);
   //console.log('start-stop-presentation>>>domainDetails>>>', domainDetails[data.domain]);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.send({ status: 'ok' });
});

app.post("/login", (req, res) => {
   // console.log("login req>>" + req.body.email);
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

    //console.log(title);
   // console.log(file);
    try {
        res.status(200).json({
            status: "success",
            message: "File created successfully!!",
            code:200
        });
    } catch (error) {
        console.log(error);
        res.json({
            error,
        });
    }

});

// app.get("/process_file", (req, res) => {
//     console.log("process file....");

//   var process = processFile();
 
//   if(process){
//     res.status(200).json({
//         status: "success",
//         code:200,
//         message: "File Processed successfully!",
//     });
//   }else{
//     res.status(200).json({
//         status: "fail",
//         code:101,
//         message: "File Processing Failed,Please Upload Correct file!",
//     });
//   }
    
// });

let createHash = secret => {
    let cipher = crypto.createCipher('blowfish', secret);
    return cipher.final('hex');
};

// Actually listen
server.listen(opts.port || null//,function() {
   // console.log(`Server running at http://${opts.port}/`);
    // const data = fs.readFileSync(opts.baseDir + '/html/index.html', 'utf8');
    // //console.log("file content::"+data);
    // const dom = htmlParser.parse(data);
    // var scriptTags = dom.querySelectorAll('script');
    // console.log(scriptTags[scriptTags.length-1].remove());

// });
);

//  function processFile(){
//     try {
//         const data = fs.readFileSync(opts.baseDir + '/html/index.html', 'utf8');

//         const dom = htmlParser.parse(data);

//         if(dom.querySelector('.slides') == null){
//             return false;
//         }
        

//         console.log("dom>>>"+dom);
//     } catch (err) {
//         console.error(err);
//     }
//     return true;
//  }

let brown = '\033[33m',
    green = '\033[32m',
    reset = '\033[0m';

console.log(brown + "reveal.js:" + reset + " Multiplex running on port " + green + opts.port + reset);