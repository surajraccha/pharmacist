///backup///

//const socketDomain = "http://localhost:4002/";
const socketDomain = "https://"+ window.location.hostname;
//test Server
//const API_URL = "https://dialertest.americansleepdentistry.com/communication-api/update-secure-slide-login";

//Live Server
const API_URL = "https://dialer.americansleepdentistry.com/communication-api/update-secure-slide-login";

//local server
//const API_URL = "http://localhost:8081/update-secure-slide-login";

const params = new URLSearchParams(window.location.search);
const control = params.get('m') ? true : false;
var domain = window.location.hostname;
domain = domain.replace('www.', '');
domain = domain.replace('.com', '');
console.log(domain);

Reveal.initialize({
  width: SLConfig.deck.width,
  height: SLConfig.deck.height,
  margin: 0.05,
  hash: true,
  controls: control,
  touch: false,
  overview: control,
  keyboard: control,
  progress: true,
  mouseWheel: false,
  showNotes: SLConfig.deck.share_notes ? 'separate-page' : false,
  slideNumber: SLConfig.deck.slide_number,
  fragmentInURL: true,

  autoSlide: SLConfig.deck.auto_slide_interval || 0,
  autoSlideStoppable: true,

  autoAnimateMatcher: SL.deck.AutoAnimate.matcher,

  rollingLinks: false,
  center: SLConfig.deck.center || false,
  shuffle: SLConfig.deck.shuffle || false,
  loop: SLConfig.deck.should_loop || false,
  rtl: SLConfig.deck.rtl || false,
  navigationMode: SLConfig.deck.navigation_mode,

  transition: SLConfig.deck.transition,
  backgroundTransition: SLConfig.deck.background_transition,

  pdfMaxPagesPerSlide: 1,

  highlight: {
    escapeHTML: false
  },

  plugins: [RevealHighlight],
  multiplex: {
    // Example values. To generate your own, see the socket.io server instructions.
    secret: control ? '16232158975299267019' : null, // Obtained from the socket.io server. Gives this (the master) control of the presentation
    id: '17fa12279c3854fe', // Obtained from socket.io server
    url: socketDomain, // Location of socket.io server
    domain: domain
  },

  // Don't forget to add the dependencies
  dependencies: [
    { src: `/socket.io/socket.io.js`, async: true },
     {
       src: params.get('m') ?
         './../master.js' :
         './../client.js', async: true
     }
    // {
    //   src: params.get('m') ?
    //     'plugin/master.js' :
    //     'plugin/client.js', async: true
    // }
  ]
});

document.addEventListener("DOMContentLoaded", function () {
 // var cloneBody = $('body').clone().find('script').remove().end();
  var labels = document.body.querySelectorAll('label');
 //console.log("body classlist::", labels);
 // const placeholders = cloneBody.text().match(/\[\[(.*?)\]\]/g);
  var HTMLPlaceholderClasses = [];
  for (var j in labels) {
    if(HTMLPlaceholderClasses.indexOf(labels[j].className) == -1)
        HTMLPlaceholderClasses.push(labels[j].className);
   // console.log(labels[j].className);
    // placeholders[j] = placeholders[j].replace("[[", "").replace("]]", "");

    // if (HTMLPlaceholderClasses.indexOf(placeholders[j]) === -1) {
    //   HTMLPlaceholderClasses.push(placeholders[j]);
    // }
  }

  document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "none";
  const params = new URLSearchParams(window.location.search);
  var mode = params.get('m');
  var multiplex = Reveal.getConfig().multiplex;
  var socketId = multiplex.id;
  var socket = io.connect(multiplex.url);
  const domain = multiplex.domain;

  // var html_placeholder_class_and_innerHTML_object = {};

  // for (var j in HTMLPlaceholderClasses) {
  //   var arr = [];
  //   var elements = document.getElementsByClassName(HTMLPlaceholderClasses[j]);
  //   if (elements) {
  //     arr = [];
  //     for (var e = 0; e < elements.length; e++) {
  //       arr.push(elements[e].innerHTML);
  //     }
  //     html_placeholder_class_and_innerHTML_object[HTMLPlaceholderClasses[j]] = arr;
  //   }
  // }

  ///socket requests

  socket.emit('fetch-data', { socketId: multiplex.id, domain: domain }, function (response) {
    if (response.status) {
      if (response.domainSecurity == true ){
        if (!localStorage.getItem("password") || localStorage.getItem("password") != CryptoJS.AES.decrypt(response.token, domain).toString(CryptoJS.enc.Utf8)) {
          Reveal.setState({
            indexh: 1,
            indexv: 0,
            overview: false,
            paused: false
          });
          return;
        }
      }else if(response.domainSecurity == null || response.domainSecurity == undefined){
        Reveal.setState({
          indexh: 0,
          indexv: 0,
          overview: false,
          paused: false
        });
        return;
      }

      document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "contents";
      replacePlaceholders(response.data);
      Reveal.setState(response.currentSlideState);
    }
  });

  socket.on('change-slide', function (data) {
    if (data.socketId !== socketId) { return; }
    if (data.domain !== domain) { return; }

    if (data.token && !localStorage.getItem("token")) {
      localStorage.setItem("token", data.token);
    }
    
    if (data.domainSecurity == true && data.state && data.state.indexh > 1){
      if (!localStorage.getItem("password") || localStorage.getItem("password") != CryptoJS.AES.decrypt(data.token, domain).toString(CryptoJS.enc.Utf8)) {
        Reveal.setState({
          indexh: 1,
          indexv: 0,
          overview: false,
          paused: false
        });
        return;
      }
    }else if(data.domainSecurity == null || data.domainSecurity == undefined){
      Reveal.setState({
        indexh: 0,
        indexv: 0,
        overview: false,
        paused: false
      });
      return;
    }

    document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "contents";
    replacePlaceholders(data.placeholders);
    Reveal.setState(data.state);
  });

  socket.on('disconnect-client', function (data) {
    if (data.socketId !== socketId) { return; }

    if (data.domain !== domain) { return; }
    document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "none";
    if (data.state) {
      Reveal.setState(data.state);
    }

    document.getElementsByClassName("passwordSuccess")[0].innerHTML = "";
    document.getElementsByClassName("passwordError")[0].innerHTML = "";
    document.getElementsByClassName("submit")[0].style.display = "inline";
    document.getElementsByClassName("password")[0].value = null;
    document.getElementsByClassName("password")[0].style.display = "inline";
    document.getElementsByClassName("togglePassword")[0].style.display = "inline";

    localStorage.removeItem("password");
    localStorage.removeItem("token");

  })

  //Replace Placeholder Logic 

  function replacePlaceholders(placeholders) {
    if (placeholders) {
      var tempPlaceholder = null,value ="";
      for(var i in HTMLPlaceholderClasses){
        tempPlaceholder = HTMLPlaceholderClasses[i];
        if(placeholders.hasOwnProperty(tempPlaceholder)){
          if(placeholders[tempPlaceholder] != null && placeholders[tempPlaceholder] !== ""){
                 value = placeholders[tempPlaceholder];
          }else{
              value ="[Data Not Available]";
          }
        }else{
             value ="[Placeholder Not Available]";
        }
        var labelElements = document.getElementsByClassName(tempPlaceholder);
        for(var index = 0;index <labelElements.length;index++){
          document.getElementsByClassName(tempPlaceholder)[index].innerHTML = value;
        }
        BrowserDepedancy();
      }
      // var tempPlaceholder = null, innerHTMLList = null;

      // for (var i in HTMLPlaceholderClasses) {
      //   tempPlaceholder = HTMLPlaceholderClasses[i];
      //   innerHTMLList = html_placeholder_class_and_innerHTML_object[tempPlaceholder];
      //   if (innerHTMLList !== null) {
      //     for (var j = 0; j < innerHTMLList.length; j++) {
      //       var tempText = innerHTMLList[j].match(/\[\[(.*?)\]\]/g), text = innerHTMLList[j], value = null;

      //       if (tempText && document.getElementsByClassName(tempPlaceholder)) {
      //         for (var tempItr = 0; tempItr < tempText.length; tempItr++) {
      //           tempText[tempItr] = tempText[tempItr].replace("[[", "").replace("]]", "");
      //           if (placeholders.hasOwnProperty(tempText[tempItr])) {
      //             value = placeholders[tempText[tempItr]] != null && placeholders[tempText[tempItr]] !== "" ? placeholders[tempText[tempItr]] : "[Data Not Available]";
      //             if (/^[$]/g.test(value)) {
      //               value = value.replace(/\.00$/, '');
      //             }
      //           } else {
      //             value = "[Placeholder Not Available]";
      //           }
      //           text = text.replace(`[[${tempText[tempItr]}]]`, value);
      //         }
      //         document.getElementsByClassName(tempPlaceholder)[j].innerHTML = text;
      //         // console.log(tempPlaceholder, "::", text);
      //       }
      //     }
      //   }
      //   BrowserDepedancy();
      // }
    } else {
      location.reload(true);
    }
  }

  function BrowserDepedancy() {
    var isInFullScreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
      (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
      (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
      (document.msFullscreenElement && document.msFullscreenElement !== null);

    if (isInFullScreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  //EventListener functions
  var element = document.getElementsByClassName("password");
  element[0].addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
      checkSecureLogin(element);
      event.preventDefault();
    }
  });

  document.getElementsByClassName("submit")[0].addEventListener('click', function () {
    checkSecureLogin(element);
  });

  function checkSecureLogin(element) {
    // console.log("token>>", CryptoJS.AES.decrypt(localStorage.getItem("token"),domain).toString(CryptoJS.enc.Utf8)," ",localStorage.getItem("token"));
    var token = localStorage.getItem("token");
    console.log("token>>>", token);
    if (!token || token == null || token == "") {
      location.reload(true);
      return;
    }
    if (element[0].value == "" || element[0].value == null || element[0].value != CryptoJS.AES.decrypt(token, domain).toString(CryptoJS.enc.Utf8)) {
      document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Invalid Password!";
      element[0].value = null;
      return;
    }
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({
        "orderId": element[0].value,
        "securedSlidesLoggedIn": true
      })
    }).then(res => res.json())
      .then(res => {
        //console.log(res);
        if (res.status == 200) {
          document.getElementsByClassName("passwordError")[0].innerHTML = "";
          document.getElementsByClassName("passwordSuccess")[0].innerHTML = "<br><b>Login Successful!</b>";
          document.getElementsByClassName("submit")[0].style.display = "none";
          element[0].style.display = "none";
          document.getElementsByClassName("togglePassword")[0].style.display = "none";
          localStorage.setItem("password", element[0].value);
        } else {
          document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Invalid Password!";
          element[0].value = null;
        }
      })
      .catch(err => {
        document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Invalid Password!";
        element[0].value = null;
      });
  }

});

function onlyNumberKey(evt) {
  // Only ASCII character in that range allowed
  var ASCIICode = (evt.which) ? evt.which : evt.keyCode
  if ((ASCIICode < 48 || ASCIICode > 57))
    return false;
  return true;
}

window.onlyNumberKey = onlyNumberKey;

const togglePassword = document.querySelectorAll('.togglePassword');
const password = document.querySelectorAll('.password');
if(togglePassword != null && togglePassword.length > 0){
  togglePassword[0].addEventListener('click', function (e) {
    // toggle the type attribute
    const type = password[0].getAttribute('type') === 'password' ? 'text' : 'password';
    password[0].setAttribute('type', type);
    // toggle the eye slash icon
    this.classList.toggle('fa-eye-slash');
  });
}
