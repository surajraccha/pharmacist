const envirnoment="production";
//const envirnoment="testing";
//const envirnoment = "dev";

var SOCKET_DOMAIN = "";
var API_URL = "";
var CLIENT_JS = "";
var MASTER_JS = "";

switch (envirnoment) {
  case 'production':
    SOCKET_DOMAIN = "https://" + window.location.hostname;
    API_URL = "https://dialer.americansleepdentistry.com/communication-api/update-secure-slide-login";
    CLIENT_JS = "./../client.js";
    MASTER_JS = "./../master.js";
    break;
  case 'testing':
    SOCKET_DOMAIN = "https://" + window.location.hostname;
    API_URL = "https://dialertest.americansleepdentistry.com/communication-api/update-secure-slide-login";
    CLIENT_JS = "./../client.js";
    MASTER_JS = "./../master.js";
    break;
  case 'dev':
    SOCKET_DOMAIN = "http://localhost:4002/";
    API_URL = "http://localhost:8081/update-secure-slide-login";
    CLIENT_JS = "plugin/client.js";
    MASTER_JS = "plugin/master.js";
    break;
}

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
    url: SOCKET_DOMAIN, // Location of socket.io server
    domain: domain
  },

  // Don't forget to add the dependencies
  dependencies: [
    { src: `/socket.io/socket.io.js`, async: true },
    {
      src: params.get('m') ? MASTER_JS : CLIENT_JS, async: true
    }
  ]
});

document.addEventListener("DOMContentLoaded", function () {
  var labels = document.body.querySelectorAll('label');

  var HTMLPlaceholderClasses = [];
  for (var j in labels) {
    if (HTMLPlaceholderClasses.indexOf(labels[j].className) == -1)
      HTMLPlaceholderClasses.push(labels[j].className);
  }
  console.log(HTMLPlaceholderClasses);

  document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "none";
  const params = new URLSearchParams(window.location.search);
  var mode = params.get('m');
  var multiplex = Reveal.getConfig().multiplex;
  var socketId = multiplex.id;
  var socket = io.connect(multiplex.url);
  const domain = multiplex.domain;

  ///socket requests

  socket.emit('fetch-data', { socketId: multiplex.id, domain: domain }, function (response) {
    if (response.status) {
      if (mode != 'p') {
        if (response.domainSecurity != null) {
          localStorage.setItem("domainSecurity", response.domainSecurity);
        }
        if (response.token) {
          localStorage.setItem("token", response.token);
        }
        if (response.domainSecurity == true) {
          if (!localStorage.getItem("password") || localStorage.getItem("password") != CryptoJS.AES.decrypt(response.token, domain).toString(CryptoJS.enc.Utf8)) {
            Reveal.setState({
              indexh: 1,
              indexv: 0,
              overview: false,
              paused: false
            });
            return;
          }
        } else if (response.domainSecurity == null || response.domainSecurity == undefined) {
          Reveal.setState({
            indexh: 0,
            indexv: 0,
            overview: false,
            paused: false
          });
          return;
        }
      }
      document.getElementsByClassName("personal_information_first_last_name")[0].style.display = "contents";
      replacePlaceholders(response.data);
      Reveal.setState(response.currentSlideState);
    }
  });

  socket.on('change-slide', function (data) {
    if (data.socketId !== socketId) { return; }
    if (data.domain !== domain) { return; }
    if (mode === 'p' && data.domainSecurity && data.state && data.state.indexh >= 2) {   //calling warning pop up for agent.
      if (data.userLoggedIn) {
        closePopup();
      } else {
        showPopup();
      }
    }

    if (mode != 'p') {
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      if (data.domainSecurity != null) {
        localStorage.setItem("domainSecurity", data.domainSecurity);
      }
  
      if (data.domainSecurity == true && data.state && data.state.indexh > 1) {
        if (!localStorage.getItem("password") || localStorage.getItem("password") != CryptoJS.AES.decrypt(data.token, domain).toString(CryptoJS.enc.Utf8)) {
          Reveal.setState({
            indexh: 1,
            indexv: 0,
            overview: false,
            paused: false
          });
          return;
        }
      } else if (data.domainSecurity == null || data.domainSecurity == undefined) {
        Reveal.setState({
          indexh: 0,
          indexv: 0,
          overview: false,
          paused: false
        });
        return;
      }
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

    if (mode != 'p') {
      localStorage.removeItem("password");
      localStorage.removeItem("token");
      localStorage.removeItem("domainSecurity");
    }
  })

  //Replace Placeholder Logic 

  function replacePlaceholders(placeholders) {
    if (placeholders) {
      var tempPlaceholder = null, value = "";
      for (var i in HTMLPlaceholderClasses) {
        tempPlaceholder = HTMLPlaceholderClasses[i];
        if (placeholders.hasOwnProperty(tempPlaceholder)) {
          if (placeholders[tempPlaceholder] != null && placeholders[tempPlaceholder] !== "") {
            value = placeholders[tempPlaceholder];
          } else {
            value = "";
          }
        } else {
          value = "[Placeholder Not Available]";
        }
        var labelElements = document.getElementsByClassName(tempPlaceholder);
        for (var index = 0; index < labelElements.length; index++) {
          document.getElementsByClassName(tempPlaceholder)[index].innerHTML = value;
        }
        BrowserDepedancy();
      }
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
    if (!token || token == null || token == "") {
      location.reload(true);
      return;
    }
    if (element[0].value == "" || element[0].value == null || element[0].value != CryptoJS.AES.decrypt(token, domain).toString(CryptoJS.enc.Utf8)) {
      document.getElementsByClassName("passwordError")[0].innerHTML = "<br>Invalid Password!";
      element[0].value = null;
      return;
    }

    if (mode === 'p') {
      document.getElementsByClassName("passwordError")[0].innerHTML = "";
      document.getElementsByClassName("passwordSuccess")[0].innerHTML = "<br><b>Login Successful!</b>";
      document.getElementsByClassName("submit")[0].style.display = "none";
      element[0].style.display = "none";
      document.getElementsByClassName("togglePassword")[0].style.display = "none";
      localStorage.setItem("password", element[0].value);
    } else {
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify({
          "orderId": element[0].value,
          "slidePresentationDetails.userLoggedIn": true
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
  }

  // code for warning pop up to agent that user is not logged in.
  var css = document.createElement('style');
  const popupFontSize = (window.innerHeight * 0.06).toString() + 'px';
  css.innerHTML = `
      :root {
        --popup-font-size: ${popupFontSize};
      }
    
      .popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: transparent;
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1;
      }
    
      .popup-message {
        background-color: #ED2939;
        color: white;
        padding: 20px;
        border-radius: 5px;
        font-size: var(--popup-font-size);
      }
    
      .popup-message p {
        margin: 0;
      }
    
      .popup-close {
        position: absolute;
        top: 10px;
        right: 10px;
        color: white;
        font-size: var(--popup-font-size);
        cursor: pointer;
      }
    `;

  window.addEventListener('resize', () => {
    const popupFontSize = (window.innerHeight * 0.10).toString() + 'px';
    document.documentElement.style.setProperty('--popup-font-size', popupFontSize);
  });

  document.head.appendChild(css);

  // Create the popup dynamically
  function createPopup(message) {
    // Create the popup container
    var popup = document.createElement('div');
    popup.classList.add('popup');

    // Create the message container
    var messageContainer = document.createElement('div');
    messageContainer.classList.add('popup-message');

    // Create the message
    var messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);

    // Create the close button
    var closeButton = document.createElement('p');
    closeButton.classList.add('popup-close');
    closeButton.textContent = 'X';
    closeButton.addEventListener('click', function () {
      popup.style.display = 'none';
    });
    messageContainer.appendChild(closeButton);

    // Add the message container to the popup container
    popup.appendChild(messageContainer);

    // Add the popup container to the body
    document.body.appendChild(popup);

    return popup;
  }

  // Show the popup
  function showPopup() {
    var popup = createPopup('Patient Not Logged In!!!');
    popup.style.display = 'flex';

    // Close the popup when clicked outside of the popup box
    popup.addEventListener('click', function (event) {
      if (event.target.classList.contains('popup')) {
        popup.style.display = 'none';
      }
    });
  }

  function closePopup() {
    const popup = document.getElementsByClassName('popup');
    if (popup) {
      for (var i = 0; i < popup.length; i++) {
        popup[i].style.display = 'none';
      }
    }
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
if (togglePassword != null && togglePassword.length > 0) {
  togglePassword[0].addEventListener('click', function (e) {
    // toggle the type attribute
    const type = password[0].getAttribute('type') === 'password' ? 'text' : 'password';
    password[0].setAttribute('type', type);
    // toggle the eye slash icon
    this.classList.toggle('fa-eye-slash');
  });
}
