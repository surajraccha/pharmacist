'use-strict';

var openFile = function(event) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function(){
      var text = reader.result;
      if(text){
        let parser = new DOMParser();
        let doc = parser.parseFromString(text, 'text/html');
        //console.log(doc);
        if(doc && doc.body && doc.body.classList[0] === "reveal-viewport"){
             doc.querySelectorAll('.slides > *').forEach(function(node) {
                console.log(">>>",node.textContent.match(/\[\[(.*?)\]\]/g));
            });
            //console.log(doc);
            // getTextNodesIn(doc.body,function(textnode){
            //     console.table(textnode);
            // })
        }else{
            //wrong html uploaded
        }
      }
    };
    reader.readAsText(input.files[0]);
};

function getTextNodesIn(elem, opt_fnFilter) {
    var textNodes = [];
    if (elem) {
      for (var nodes = elem.childNodes, i = nodes.length; i--;) {
        var node = nodes[i], nodeType = node.nodeType;
        if (nodeType == 3) {
          if (!opt_fnFilter || opt_fnFilter(node, elem)) {
            textNodes.push(node);
          }
        }
        else if (nodeType == 1 || nodeType == 9 || nodeType == 11) {
          textNodes = textNodes.concat(getTextNodesIn(node, opt_fnFilter));
        }
      }
    }
    return textNodes;
  }

document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:4002";

   
    //-------------------------------------------File Processing--------------------------------------------------//
    //selecting all required elements
    const dropArea = document.querySelector(".drag-area"),
        dragText = dropArea.querySelector("header"),
        button = dropArea.querySelector("button"),
        input = dropArea.querySelector("input");
    let file; //this is a global variable and we'll use it inside multiple functions
    button.onclick = () => {
        input.click(); //if user click on the button then the input also clicked

    }
    input.addEventListener("change", function () {
        //getting user select file and [0] this means if user select multiple files then we'll select only the first one
        file = this.files[0];
        dropArea.classList.add("active");
        showFile(); //calling function
    });
    //If user Drag File Over DropArea
    dropArea.addEventListener("dragover", (event) => {
        event.preventDefault(); //preventing from default behaviour
        dropArea.classList.add("active");
        dragText.textContent = "Release to Upload File";
    });
    //If user leave dragged File from DropArea
    dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("active");
        dragText.textContent = "Drag & Drop to Upload File";
    });
    //If user drop File on DropArea
    dropArea.addEventListener("drop", (event) => {
        event.preventDefault(); //preventing from default behaviour
        //getting user select file and [0] this means if user select multiple files then we'll select only the first one
        file = event.dataTransfer.files[0];
        showFile(); //calling function
    });
    function showFile() {
        let fileType = file.type; //getting selected file type
        let validExtensions = ["text/html", "text/htm"]; //adding some valid image extensions in array
        if (validExtensions.includes(fileType)) { //if user selected file is an image file
            let fileReader = new FileReader(); //creating new FileReader object
            fileReader.onload = () => {
                let fileURL = fileReader.result; //passing user file source in fileURL variable
            }
            fileReader.readAsDataURL(file);
            
        } else {
            document.getElementById("uploadError").textContent="This is not an html File!";
            dropArea.classList.remove("active");
            dragText.textContent = "Drag & Drop to Upload File";
            document.getElementById("choose_file").value = null;
        }
    }

    /*----------------------EventListeners-------------------------------*/

    document.getElementById("login").addEventListener("submit", function (e) {
        var email = document.getElementById("email").value;
        var password = document.getElementById("password").value;

        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        }).then(res => res.json())
            .then(res => {
                if (res.code === 200) {
                    document.getElementById("login_container").style.display = "none";
                    document.getElementById("upload_container").style.display = "flex";
                } else {
                    if(res.code===101)
                      document.getElementById("emailError").textContent=res.message;
                    else if(res.code===102)
                      document.getElementById("passwordError").textContent=res.message;
                }
            });
        e.preventDefault();
    });


    document.querySelector('.upload').addEventListener("submit", function (e) {
        e.preventDefault();
        // console.log("file:"+e.target);
        // document.getElementById("upload_container").style.display="none";
        // document.getElementById("loading").style.display = "flex";
        // document.getElementById("processingText").innerHTML="Processing File...";
        // document.getElementById("cssloader").style.display="flex";
        let file = document.getElementById("choose_file").files[0];
        console.log("file>>>",file);
        let formData = new FormData();
        formData.append('title','index.html');
        formData.append('file', file);
        let fileReader = new FileReader(); 
        console.log("file reader>>",fileReader.readAsText(file));
    
        // document.getElementById("processingText").innerHTML = "File Processing Done!";
        // document.getElementById("loaderText").innerHTML = "Uploading File...";
        
    //     fetch(`${API_URL}/upload_file`, {
    //         method: 'POST',
    //         body: formData
    //     })
    //     .then(resp => resp.json())
    //     .then(data => {
    //                 if(data.code === 200){
    //                     document.getElementById("loaderText").innerHTML = "File Uploaded!";
    //                     document.getElementById("backToLogin").style.display="block";
    //                 }else{
    //                     document.getElementById("loaderText").textContent="Error,Unable to upload File";
    //                 }
    //                 document.getElementById("cssloader").style.display="none";

    //                 // fetch(`${API_URL}/process_file`, {
    //                 //     method: 'GET'
    //                 // })
    //                 // .then(res=>res.json())
    //                 // .then(res=>{
                        
                        
    //                 //     document.getElementById("processingText").innerHTML = res.message;                       
    //                 //     document.getElementById("cssloader").style.display="none";
    //                 // })
    //                 // .catch(err=>{
    //                 //     console.log("processing error"+err);
    //                 //     document.getElementById("processingText").innerHTML = err.message;
    //                 //     document.getElementById("backToLogin").style.display="block";
    //                 //     document.getElementById("cssloader").style.display="none";
    //                 // });
    //     })
     });
 
    document.getElementById("backToLogin").addEventListener("click", function (e) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("login_container").style.display = "flex";
        document.getElementById("password").value=null;
    });

    document.getElementById("backToUpload").addEventListener("click", function (e) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("upload_container").style.display = "flex";
    });
});
