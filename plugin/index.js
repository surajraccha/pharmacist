//const envirnoment = "production";
const envirnoment = "testing";
//const envirnoment = "dev";

const config = {
  production: {
    API_URL: "https://dialer.americansleepdentistry.com/communication-api/",
  },
  testing: {
    API_URL: "https://dialertest.americansleepdentistry.com/communication-api/",
  },
  dev: {
    API_URL: "http://localhost:8081/",
  }
};

const { API_URL } = config[envirnoment];
const SLIDE_PERSONAL_INFORMATION = 15;
const SLIDE_SLEEP_CONSULTATION = 33;
const SLIDE_PAYMENT_INFORMATION = 32;
// Define a mapping between slide index and the field to check
const slideFieldMapping = {
  15: ["personal_information_first_name", "personal_information_last_name"],
  33: ["Sleep_Consultation_Date_Patient"]
};

const orderMandatoryFields = {
  personal_information_first_name: [15, "Personal Information First Name"],
  personal_information_last_name: [15, "Personal Information Last Name"],
  personal_information_address1: [17, "Personal Information Address"],
  personal_information_city: [17, "Personal Information City"],
  personal_information_state: [17, "Personal Information State"],
  personal_information_zipcode: [17, "Personal Information Zip Code"],
  personal_information_mobile_phone: [19, "Personal Information Mobile Phone"],
  personal_information_email: [21, "Personal Information Email"],
  patient_quest_Patient_Time_Zone: [23, "Patient Questionnaire Time Zone"]
};

const paymentMandatoryFields = {
  payment_information_first_name: [25, "Payment Information First Name"],
  payment_information_last_name: [25, "Payment Information Last Name"],
  payment_information_address: [26, "Payment Information Address"],
  payment_information_city: [26, "Payment Information City"],
  payment_information_state: [26, "Payment Information State"],
  payment_information_zip: [26, "Payment Information Zip"],
  payment_information_credit_card_number: [28, "Payment Information Credit Card Number"],
  payment_information_expiration_date: [29, "Payment Information Expiration Date"],
  payment_information_credit_card_security_code: [30, "Payment Information Credit Card Security Code"],
  payment_information_charge_amount :[31, "Payment Information Charge Amount"]
}

document.addEventListener("DOMContentLoaded", function () {
  //function declaration
  window.openNewPatient = openNewPatient;
  window.openPersonalInformation = openPersonalInformation;
  window.resetFields = resetFields;
  window.closeCustomPopup = closeCustomPopup;
  window.replacePlaceholders = replacePlaceholders;
  window.showNavigateRightButton = showNavigateRightButton;
  window.openCalendly = openCalendly;
  window.fetchData = fetchData;
  window.showCustomAlert = showCustomAlert;
  window.closeAlert = closeAlert;
  window.chargeCreditCard = chargeCreditCard;
  window.checkAllMandatoryFieldsCompleted = checkAllMandatoryFieldsCompleted;

  //Globale variables
  var labels = document.body.querySelectorAll('label');
  var HTMLPlaceholderClasses = [...new Set(Array.from(labels).map(label => label.className))];
  const inputFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="date"],input[type="number"], textarea,select');
  const agentId = window.location.pathname.replace(/^\/+/g, '');
  var intervalId = null;
  const DATE_DEFAULT_TIMEZONE_SET = "America/Denver";

  initUserData();

  //-----------------data related functions -------------------//
  function initUserData() {
    const storedData = localStorage.getItem('userData');
    const userData = storedData ? JSON.parse(storedData) : {};
    userData["referralDoctorId"] = agentId;
    userData["hadSleepStudy"] = "Needs Sleep Study";
    localStorage.setItem('userData', JSON.stringify(userData));

    replacePlaceholders(userData);
    replaceFieldData(userData);


    //-----------------------------------Reveal JS APIs------------------------------------//
    Reveal.initialize({
      width: SLConfig.deck.width,
      height: SLConfig.deck.height,
      margin: 0.05,
      hash: true,
      controls: true,
      controlsTutorial: true,
      controlsLayout: 'edges',
      controlsBackArrows: "faded",
      touch: true,
      overview: false,
      keyboard: false,
      progress: false,
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
      plugins: [RevealHighlight]
    });

    Reveal.addEventListener('ready', function (event) {
      inputFields.forEach(element => {
        element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', saveInputFieldData);
      });

      const storedData = localStorage.getItem('userData');
      const userData = storedData ? JSON.parse(storedData) : {};

      if(userData && userData["payment_status"] == 'fulfilled'){
        document.getElementById("charge_credit_card").disabled = true;
      }
    });

    Reveal.on('slidechanged', (event) => {
      // event.previousSlide, event.currentSlide, event.indexh, event.indexv
      const storedData = localStorage.getItem('userData');
      const userData = storedData ? JSON.parse(storedData) : {};

      //code for required user data validation
      for (const key in slideFieldMapping) {
        if (event.indexh > key) {
          const fieldsToCheck = slideFieldMapping[key];
          if (!fieldsToCheck.every(field => userData[field])) {
            Reveal.setState({
              indexh: key,
              indexv: 0
            });
            return;
          }
        }
      }

      if (event.indexh >= 33 && checkAllMandatoryFieldsCompleted(orderMandatoryFields) && !localStorage.getItem("order")) {
        try {
          const requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(transformUserDataToOrderDTO(userData)),
          };

          fetch(API_URL + "create-new-lead", requestOptions)
            .then(response => response.json())
            .then((response) => {
              if (response.status == 500) {
                showCustomAlert('Error',response.message,false);
              } else if (response.status == 200 && response.data) {
                if (Object.entries(response.data.data).length > 0 && response.data.data.insuranceInfo) {
                  localStorage.setItem("order", JSON.stringify(response.data.data));
                  userData["orderId"] = response.data.data.orderId;
                  localStorage.setItem("userData", JSON.stringify(userData));

                  openCalendly('schedule');
                  showCustomAlert('Success',response.message,true);
                }
              }
            }).catch(error => {
              showCustomAlert('Error',error.message,false);
            });
        } catch (error) {
          console.error('Error:', error.message);
        }
      }else if(event.indexh >= SLIDE_PAYMENT_INFORMATION){
        checkAllMandatoryFieldsCompleted(paymentMandatoryFields)
      }

      if (localStorage.getItem("order") && document.getElementById('calendly_div').children.length == 0) {
        openCalendly('schedule');
      }

      showNavigateRightButton(event.indexh, userData);

      function transformUserDataToOrderDTO(userData) {
        return {
          "customer": {
            "firstName": userData["personal_information_first_name"] || "",
            "lastName": userData["personal_information_last_name"] || "",
            "address1": userData["personal_information_address1"] || "",
            "city": userData["personal_information_city"] || "",
            "state": userData["personal_information_state"] || "",
            "zip": userData["personal_information_zipcode"] || "",
            "mobilePhone": userData["personal_information_mobile_phone"] || "",
            "email": userData["personal_information_email"] || "",
            "customerBackend": {
              "referralDoctorId": userData["referralDoctorId"] || ""
            }
          },
          "timeZone": userData["patient_quest_Patient_Time_Zone"] || "",
          "paymentInfo": {
          },
          "hadSleepStudy": userData["hadSleepStudy"] || "",
          "leadType": "patient"
        };
      }
    });

    //---------------------------------------------------------------------//
  }

  function saveInputFieldData(event) {
    const storedData = localStorage.getItem('userData');
    const userData = storedData ? JSON.parse(storedData) : {};
    var revealState = Reveal.getState();

    event.target.value != null && event.target.value != "" ? (userData[event.target.name] = event.target.value) : delete userData[event.target.name];

    localStorage.setItem('userData', JSON.stringify(userData));
    replacePlaceholders(userData);
    showNavigateRightButton(revealState.indexh, userData);
  }

  function replaceFieldData(userData) {
    inputFields.forEach(element => {
      if (element.tagName == 'SELECT') {
        element.value = 'default';
      } else {
        element.value = userData[element.name] || "";
      }
    });
  }

  //----------------------------------- -------------------//
  //-----------------Pop up related functions -------------------//
  function openNewPatient() {
    document.getElementById('customPopup').style.display = 'flex';
  }

  function closeCustomPopup() {
    document.getElementById('customPopup').style.display = 'none';
  }

  function resetFields() {
    // Add logic to reset fields or perform other actions
    console.log("Resetting fields...");
    localStorage.clear();
    replacePlaceholders({})
    replaceFieldData({});
    Reveal.setState({
      indexh: 3,  //3 number slide is for restart the presentation
      indexv: 0,
      overview: false,
      paused: false
    });
    closeCustomPopup();
  }

  function openPersonalInformation() {
    Reveal.setState({
      indexh: SLIDE_PERSONAL_INFORMATION,  //18 number slide is for personal information
      indexv: 0,
      overview: false,
      paused: false
    });
  }

  //-------------------------------------------------------//

  //-----------------placeholder related functions -------------------//
  function replacePlaceholders(userData) {
    for (var i in HTMLPlaceholderClasses) {
      var placeholder = HTMLPlaceholderClasses[i];
      var value = "";

      if (userData.hasOwnProperty(placeholder) || placeholder === "personal_information_first_last_name") {
        if (placeholder === "personal_information_first_last_name") {
          const firstName = userData["personal_information_first_name"] || "";
          const lastName = userData["personal_information_last_name"] || "";
          value = `${firstName} ${lastName}`.trim();
        } else {
          value = userData[placeholder];
        }
      }

      var labelElements = document.getElementsByClassName(placeholder);
      Array.from(labelElements).forEach(element => {
        if (element.tagName === 'LABEL')
          element.innerHTML = value;
      });
    }
    BrowserDepedancy();
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

  //---------------------------------------------//

  function showNavigateRightButton(indexh, userData) {
    const fieldsToCheck = slideFieldMapping[indexh];
    if (fieldsToCheck) { //for slide 18,171
      const flag = fieldsToCheck.every(field => userData[field]);
      document.getElementsByClassName("navigate-right")[0].style.display = flag ? 'block' : 'none';
    } else {
      document.getElementsByClassName("navigate-right")[0].style.display = 'block';
    }
  }


  //-------------------------calendly reschedule/cancel events-----------------------------------//

  function openCalendly(calendlyEvent) {
    const storedData = localStorage.getItem('order');
    const leadData = storedData ? JSON.parse(storedData) : {};
    var calendlyUrl = "";
    const calendlyDiv = document.getElementById('calendly_div');

    if (Object.entries(leadData).length === 0) {
      return;
    }

    const appointmentId = leadData.insuranceInfo.coverageReviewAppointmentId;

    if (calendlyEvent === 'schedule') {
      calendlyUrl = 'https://calendly.com/sleep-consultation-asd/cr?timezone=' + leadData.timeZone + "&hide_landing_page_details=1"
    } else if (calendlyEvent === 'reschedule' && appointmentId) {
      calendlyUrl = 'https://calendly.com/reschedulings/' + appointmentId + "?hide_landing_page_details=1"
    } else if (calendlyEvent === 'cancel' && appointmentId) {
      calendlyUrl = 'https://calendly.com/cancellations/' + appointmentId + "?hide_landing_page_details=1";
    }

    while (calendlyDiv.firstChild) {    //remove old calendly widget and load new 
      calendlyDiv.removeChild(calendlyDiv.firstChild);
    }

    if (calendlyUrl) {
      Calendly.initInlineWidget({
        url: calendlyUrl,
        parentElement: calendlyDiv,
        prefill: {
          name: leadData.customer.firstName + " " + leadData.customer.lastName,
          email: leadData.customer.email,
          firstName: leadData.orderId,
          customAnswers: {
          },
          utm: {
            utmContent: "leadId-" + leadData.orderId
          }
        }
      });
      if ((calendlyEvent == 'reschedule' || calendlyEvent == 'cancel') && appointmentId)
        gotoCalendlyWidget();

      fetchData(leadData.orderId, calendlyEvent);
    }
  }

  function fetchData(orderId, calendlyEvent) {
    if (orderId) {
      // Clear existing interval if any
      clearInterval(intervalId);

      // Set up a new interval
      intervalId = setInterval(() => {
        fetch(API_URL + `get-updated-lead/${orderId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(response => {
            if (response) {
              const storedData = localStorage.getItem('order');
              const leadData = storedData ? JSON.parse(storedData) : {};

              const storedData1 = localStorage.getItem('userData');
              const userData = storedData1 ? JSON.parse(storedData1) : {};

              if ((calendlyEvent == 'schedule' || calendlyEvent == 'reschedule') && response.insuranceInfo.coverageReviewAppointmentId) {
                const mdtTime = moment(response.insuranceInfo.coverageReviewDate).tz(DATE_DEFAULT_TIMEZONE_SET);
                const consultationDatePatient = mdtTime.clone().tz(response.insuranceInfo.coverageReviewDatePatientTimeZone).format('dddd, MMMM D');
                const consultationTimePatient = mdtTime.clone().tz(response.insuranceInfo.coverageReviewDatePatientTimeZone).format('hh:mm A') + ' ' + getAbbrFromTimeZonesInStandardFormate(response.insuranceInfo.coverageReviewDatePatientTimeZone);

                userData["Sleep_Consultation_Date_Patient"] = consultationDatePatient;
                userData["Sleep_Consultation_Time_Patient"] = consultationTimePatient;
               
                localStorage.setItem('userData', JSON.stringify(userData));
                replacePlaceholders(userData);

                clearInterval(intervalId);
                showNavigateRightButton(SLIDE_SLEEP_CONSULTATION, userData);
              } else if (calendlyEvent == 'cancel') {
                if (!response.insuranceInfo.coverageReviewAppointmentId) {
                  delete userData["Sleep_Consultation_Date_Patient"];
                  delete userData["Sleep_Consultation_Time_Patient"];

                  localStorage.setItem('userData', JSON.stringify(userData));
                  replacePlaceholders(userData);

                  clearInterval(intervalId);
                }
              }
              if(Object.keys(leadData).length > 0){
                leadData.insuranceInfo = response.insuranceInfo;
                localStorage.setItem('order', JSON.stringify(leadData)); 
              }
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }, 5000);
    }
  }

  function getAbbrFromTimeZonesInStandardFormate(timeZone) {
    var abbr = null;
    switch (timeZone) {
      case "America/Puerto_Rico": abbr = "Atlantic";
        break;
      case "America/New_York": abbr = "Eastern";
        break;
      case "America/Chicago": abbr = "Central";
        break;
      case "America/Phoenix": abbr = "Arizona";
        break;
      case "America/Denver": abbr = "Mountain";
        break;
      case "America/Los_Angeles": abbr = "Pacific";
        break;
      case "America/Anchorage": abbr = "Alaska";
        break;
      case "Pacific/Honolulu": abbr = "Hawaii";
        break;
      default:
        abbr = "Mountain";
    }
    return abbr;
  }

  function gotoCalendlyWidget() {
    Reveal.setState({
      indexh: 171,  //go to calendly widget slide
      indexv: 0,
      overview: false,
      paused: false
    });
  }
  //----------------------------------------------------------------------------------------------//

  //------------------ alert pop up-------------------------------------------//
  function showCustomAlert(heading,message,success) {
    const alertBox = document.getElementById('custom-alert');
    document.getElementById('alert-heading').innerText = heading;
    document.getElementById('alert-message').innerText = message;
    alertBox.style.backgroundColor = success ? '#90EE90' : '#f8d7da';
    alertBox.style.display = 'block';
    }

  function closeAlert() {
    document.getElementById('custom-alert').style.display = 'none';
    document.getElementById('alert-heading').innerText = "";
    document.getElementById('alert-message').innerText = "";
  }
  //----------------------------------------------------------------------------//

  //------------------------------------------payment function -------------------------------//
  function chargeCreditCard() {
    const storedData = localStorage.getItem('userData');
    const userData = storedData ? JSON.parse(storedData) : {};

    if (checkAllMandatoryFieldsCompleted(paymentMandatoryFields) && localStorage.getItem("order")) {
      try {
        var button = document.getElementById("charge_credit_card");
        button.disabled = true;
    
        var loader = document.createElement("div");
        loader.id = "loader";
        loader.innerHTML = "Processing,Please Wait...";
        button.parentNode.insertBefore(loader, button.nextSibling);

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transformPaymentDataToOrderDTO(userData)),
        };

        fetch(API_URL + "charge-customer", requestOptions)
          .then(response => response.json())
          .then((response) => {
            if (response.status == 500) {
              showCustomAlert('Error',response.message,false);
              button.disabled = false;
            } else if (response.status == 200 && response.data) {
              if (Object.entries(response.data.data).length > 0 && Object.entries(response.data.data.paymentInfo).length > 0) {
                openCalendly('schedule');
                localStorage.setItem("order", JSON.stringify(response.data.data));
                showCustomAlert('Success',response.message,true);
                userData["payment_status"] = "fulfilled";
                localStorage.setItem("userData", JSON.stringify(userData));
              }
            }
            loader.parentNode.removeChild(loader);
          }).catch(error => {
            showCustomAlert('Error',error.message,false);
            button.disabled = false;
            loader.parentNode.removeChild(loader);
          });
      } catch (error) {
        console.error('Error:', error.message);
        button.disabled = false;
        loader.parentNode.removeChild(loader);
      }
    }
  }

  function checkAllMandatoryFieldsCompleted(mandatoryFields) {
    const storedData = localStorage.getItem('userData');
    const userData = storedData ? JSON.parse(storedData) : {};

    const missingFields = Object.keys(mandatoryFields).filter(key => !userData[key]);

    if (missingFields.length > 0) {
      const warnings = missingFields.map(field => `${mandatoryFields[field][1]} is missing.\n`);
      Reveal.setState({
        indexh: mandatoryFields[missingFields[0]][0],
        indexv: 0
      });
      showCustomAlert('Error',warnings.join(' '),false);
      return false;
    }
    return true;
  }

  function transformPaymentDataToOrderDTO(userData) {

    const storedData = localStorage.getItem('order');
    const orderData = storedData ? JSON.parse(storedData) : {};
    const paymentInfo = {
      "paymentInfoFirstName": userData["payment_information_first_name"] || "",
      "paymentInfoLastName": userData["payment_information_last_name"] || "",
      "paymentInfoPhone": userData["personal_information_mobile_phone"] || "",
      "paymentInfoAddress": {
        "address": userData["payment_information_address"] || "",
        "city": userData["payment_information_city"] || "",
        "state": userData["payment_information_state"] || "",
        "zip": userData["payment_information_zip"] || ""
      },
      "paymentInfoCreditCardNumber": userData["payment_information_credit_card_number"] || "",
      "paymentInfoExpDate": userData["payment_information_expiration_date"] || "",
      "paymentInfoCreditCardSecurityCode": userData["payment_information_credit_card_security_code"] || "",
      "paymentHasInfo": "yes",
      "paymentInformationPaymentType": "Charging",
      "paymentInformationChargeAmount": userData["payment_information_charge_amount"]
    };
    orderData.paymentInfo = paymentInfo;

    return orderData;
  }

  //----------------------------------------------------------------------------//

  addValidationToZipCode("personal_information_zipcode");
  addValidationToZipCode("payment_information_zip");
  
  function addValidationToZipCode(elementId){
    document.getElementById(elementId).addEventListener("input", function(event) {
      const formControl = event.target;
      let transformedInput = formControl.value.replace(/[^0-9.]+/g, "");
  
      if (transformedInput.length > 5) {
          transformedInput = transformedInput.slice(0, 5) + "-" + transformedInput.slice(5, 10);
      } else if (transformedInput.length === 5) {
          transformedInput = transformedInput.replace('-', '');
      }
  
      formControl.value = transformedInput.slice(0, 10);
    });
  }


  document.getElementById("personal_information_mobile_phone").addEventListener("input", function(event) {
    const formControl = event.target;
    let transformedInput = formControl.value.replace(/[^0-9]+/g, "");

    if (transformedInput.length > 11) {
        transformedInput = transformedInput.slice(0, 11);
    }
    formControl.value = transformedInput;
});

document.getElementById("personal_information_email").addEventListener("input", function(event) {
  const formControl = event.target;
  const transformedInput = formControl.value.trim();

  // Simple email format validation using a regular expression
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(transformedInput)) {
      formControl.classList.remove("invalid");
      formControl.classList.add("valid");
  } else {
      formControl.classList.remove("valid");
      formControl.classList.add("invalid");
  }

});

});


