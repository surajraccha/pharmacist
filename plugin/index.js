function onlyNumberKey(evt) {
  // Only ASCII character in that range allowed
  var ASCIICode = (evt.which) ? evt.which : evt.keyCode
  if ((ASCIICode < 48 || ASCIICode > 57))
      return false;
  return true;
}

const socketDomain = "http://localhost:4002/";
//const socketDomain = "https://"+ window.location.hostname;
//test Server
const API_URL = "https://dialertest.americansleepdentistry.com/communication-api/update-secure-slide-login";

//Live Server
//const API_URL = "https://dialer.americansleepdentistry.com/communication-api/update-secure-slide-login";

const params = new URLSearchParams(window.location.search);
const control = params.get('m') ? true : false;
var domain = window.location.hostname;
domain = domain.replace('www.', '');
domain = domain.replace('.com', '');
console.log(domain);

// logic to add script tags dynamically
// var scriptSrc =["https://code.jquery.com/jquery-3.5.0.js","http://localhost:4000/socket.io/socket.io.js"];
// for(var i=0;i<scriptSrc.length;i++){
//   var s = document.createElement("script");
//   s.type = "text/javascript";
//   s.src = scriptSrc[i];
//   document.head.appendChild(s);
// }

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
  ]
});

//////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
 
  console.log("body classlist::", document.body.classList);
  var cloneBody = $('body').clone().find('script').remove().end();
  const placeholders = cloneBody.text().match(/\[\[(.*?)\]\]/g);
  var HTMLPlaceholderClasses = [];
  for (var j in placeholders) {
    placeholders[j] = placeholders[j].replace("[[", "").replace("]]", "");

    if (HTMLPlaceholderClasses.indexOf(placeholders[j]) === -1) {
      HTMLPlaceholderClasses.push(placeholders[j]);
    }
  }

  document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "none";
  const params = new URLSearchParams(window.location.search);
  var mode = params.get('m');
  var multiplex = Reveal.getConfig().multiplex;
  var socketId = multiplex.id;
  var socket = io.connect(multiplex.url);
  const domain = multiplex.domain;

  var html_placeholder_class_and_innerHTML_object = {};

  for (var j in HTMLPlaceholderClasses) {
    var arr = [];
    var elements = document.getElementsByClassName(HTMLPlaceholderClasses[j]);
    if (elements) {
      arr = [];
      for (var e = 0; e < elements.length; e++) {
        arr.push(elements[e].innerHTML);
      }
      html_placeholder_class_and_innerHTML_object[HTMLPlaceholderClasses[j]] = arr;
    }
  }

  ///socket requests

  socket.emit('fetch-data', { socketId: multiplex.id, domain: domain }, function (response) {
    if (response.status) {
      document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "contents";
      replacePlaceholders(response.data);
      Reveal.setState(response.currentSlideState);
      if(!localStorage.getItem("orderId") && response.data && response.data.order_id){
        localStorage.setItem("orderId",response.data.order_id);
      }
    }
  });


  socket.on('change-slide', function (data) {
    if (data.socketId !== socketId) { return; }
    if (data.domain !== domain) { return; }

    if (data.orderId && !localStorage.getItem("orderId")) {
      localStorage.setItem("orderId", data.orderId);
    }

    document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "contents";
    replacePlaceholders(data.placeholders);
    Reveal.setState(data.state);
  });


  socket.on('disconnect-client', function (data) {
    if (data.socketId !== socketId) { return; }

    if (data.domain !== domain) { return; }
    localStorage.removeItem("orderId");
    document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "none";
    if (data.state) {
      Reveal.setState(data.state);
    }

  })


  //Replace Placeholder Logic 

  function replacePlaceholders(placeholders) {

    var tempPlaceholder = null, innerHTMLList = null;

    for (var i in HTMLPlaceholderClasses) {
      tempPlaceholder = HTMLPlaceholderClasses[i];
      innerHTMLList = html_placeholder_class_and_innerHTML_object[tempPlaceholder];
      if (innerHTMLList !== null) {
        for (var j = 0; j < innerHTMLList.length; j++) {
          var tempText = innerHTMLList[j].match(/\[\[(.*?)\]\]/g), text = innerHTMLList[j], value = null;

          if (tempText && document.getElementsByClassName(tempPlaceholder)) {
            for (var tempItr = 0; tempItr < tempText.length; tempItr++) {
              tempText[tempItr] = tempText[tempItr].replace("[[", "").replace("]]", "");
              if (placeholders.hasOwnProperty(tempText[tempItr])) {
                value = placeholders[tempText[tempItr]] != null && placeholders[tempText[tempItr]] !== "" ? placeholders[tempText[tempItr]] : "[Data Not Available]";
                if (/^[$]/g.test(value)) {
                  value = value.replace(/\.00$/, '');
                }
              } else {
                value = "[Placeholder Not Available]";
              }
              text = text.replace(`[[${tempText[tempItr]}]]`, value);
            }
            document.getElementsByClassName(tempPlaceholder)[j].innerHTML = text;
            // console.log(tempPlaceholder, "::", text);
          }
        }
      }
      BrowserDepedancy();
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
  element[1].addEventListener('keypress', function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (localStorage.getItem("orderId") === event.target.value) {
        checkSecureLogin(element);
      } else {
        document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Please Enter Correct Password!";
      }
      element[1].value = null;
    }else{
      var charCode = (event.which) ? event.which : event.keyCode
	    if ((charCode < 48 || charCode > 57)){
        
      }
    }
  });

 
  document.getElementsByClassName("submit")[0].addEventListener('click', function () {
    if (localStorage.getItem("orderId") === element[1].value) {
      checkSecureLogin(element);
    } else {
      document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Please Enter Correct Password!";
    }
    element[1].value = null;
  });

  function checkSecureLogin(element) {
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({
        "orderId": localStorage.getItem("orderId"),
        "securedSlidesLoggedIn": true
      })
    })
      .then(res => {
        //console.log(res);
        document.getElementsByClassName("passwordError")[0].innerHTML = "";
        document.getElementsByClassName("passwordSuccess")[0].innerHTML = "<br><b>Login Successful!</b>";
        for (var i = 0; i < element.length; i++) {
          element[i].style.display = "none";
        }
        document.getElementsByClassName("submit")[0].style.display = "none";
      })
      .catch(err => {
        console.log(err);
        document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Please Enter Correct Password!";
      });
  }

});
window.onlyNumberKey = onlyNumberKey