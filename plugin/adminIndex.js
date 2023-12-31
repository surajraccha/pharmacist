'use-strict';
const API_URL = "http://localhost:4002";
//const API_URL = `https://${window.location.hostname}`;
window.openFile = openFile;

function openFile(event) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function(){
      var text = reader.result;
      var arr = text.match(/\[\[(.*?)\]\]/g)
      var placeholder = "",label ="";
      if(text != null && arr != null &&  arr.length > 0){
        arr.forEach((item) => {
        placeholder = "",label ="";
          if(item.split(',').length == 1){
            placeholder = item.replace("[[", "").replace("]]", "");
            if(placeholder && placeholder.length){
                label = "<label class='"+placeholder+"'></label>";
                text = text.replaceAll(item,label);
            }
          }
       });

       var blob = new Blob([text], { type: 'text/html' });
       var file = new File([blob], "test.html", {type: "text/html"});
       var formData = new FormData();
       formData.append('title','test.html');
       formData.append('file',file);
    console.log("file size>>>",file.size);

    document.getElementById("upload_container").style.display="none";
    document.getElementById("loading").style.display = "flex";
    document.getElementById("loading").style.flexDirection = "column";
    document.getElementById("loading").style.alignItems = "center";

    document.getElementById("loaderText").innerHTML = "Uploading the File,Please Wait.";
    
    fetch(`${API_URL}/upload_file`, {
        method: 'POST',
        body: formData
    })
    .then(resp => resp.json())
    .then(data => {
                if(data.code === 200){
                    document.getElementById("spinnerImage").style.display="none";
                    document.getElementById("loaderText").innerHTML = "File Uploaded!";
                    document.getElementById("backToLogin").style.display="block";
                }else{
                    document.getElementById("spinnerImage").style.display="none";
                    document.getElementById("loaderText").style.color ="red";
                    document.getElementById("loaderText").textContent="Error,Unable to upload File";
                    document.getElementById("backToUpload").style.display="block";
                }
    })
    .catch((error)=>{
        document.getElementById("spinnerImage").style.display="none";
        document.getElementById("loaderText").style.color ="red";
        document.getElementById("loaderText").textContent="Error,Unable to upload File";
        document.getElementById("backToUpload").style.display="block";
        console.log(error);
    });
       }
     };
    reader.readAsText(input.files[0]);
};

document.addEventListener("DOMContentLoaded", function () {
   
    //-------------------------------------------File Processing--------------------------------------------------//
    //selecting all required elements
    const dropArea = document.querySelector(".drag-area"),
        dragText = dropArea.querySelector("header"),
        button = dropArea.querySelector("button"),
        input = dropArea.querySelector("input");
    var file; //this is a global variable and we'll use it inside multiple functions
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
        var fileType = file.type; //getting selected file type
        var validExtensions = ["text/html", "text/htm"]; //adding some valid image extensions in array
        if (validExtensions.includes(fileType)) { //if user selected file is an image file
            var fileReader = new FileReader(); //creating new FileReader object
            fileReader.onload = () => {
                var fileURL = fileReader.result; //passing user file source in fileURL variable
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
