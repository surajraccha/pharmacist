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

const orderMandatoryFields = {
  personal_information_first_name: "Personal Information First Name",
  personal_information_last_name: "Personal Information Last Name",
  personal_information_address1: "Personal Information Address",
  personal_information_city: "Personal Information City",
  personal_information_state: "Personal Information State",
  personal_information_zipcode: "Personal Information Zip Code",
  personal_information_mobile_phone: "Personal Information Mobile Phone",
  personal_information_email: "Personal Information Email",
  patient_quest_Patient_Time_Zone: "Patient Questionnaire Time Zone"
};

const paymentMandatoryFields = {
  payment_information_first_name: "Payment Information First Name",
  payment_information_last_name: "Payment Information Last Name",
  payment_information_address: "Payment Information Address",
  payment_information_city: "Payment Information City",
  payment_information_state: "Payment Information State",
  payment_information_zip: "Payment Information Zip",
  payment_information_credit_card_number: "Payment Information Credit Card Number",
  payment_information_expiration_date: "Payment Information Expiration Date",
  payment_information_credit_card_security_code: "Payment Information Credit Card Security Code",
  payment_information_charge_amount: "Payment Information Charge Amount"
}

document.addEventListener("DOMContentLoaded", function () {
  //function declaration
  window.openNewPatient = openNewPatient;
  window.openPersonalInformation = openPersonalInformation;
  window.resetFields = resetFields;
  window.closeCustomPopup = closeCustomPopup;
  window.replacePlaceholders = replacePlaceholders;
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
      const storedData = localStorage.getItem('userData');
      const userData = storedData ? JSON.parse(storedData) : {};

      if (userData && userData["payment_status"] == 'fulfilled') {
        document.getElementById("charge_credit_card").disabled = true;
      }
    });

    Reveal.on('slidechanged', (event) => {
      // event.previousSlide, event.currentSlide, event.indexh, event.indexv
      const storedData = localStorage.getItem('userData');
      const userData = storedData ? JSON.parse(storedData) : {};

      var currentSection = event.currentSlide.closest('section');
      var validateInputs = currentSection.querySelectorAll('.validate');
      var navigationElementList = document.getElementsByClassName("navigate-right");

      if (userData && !userData["referralDoctorId"]) {
        userData["referralDoctorId"] = agentId;
        userData["hadSleepStudy"] = "Needs Sleep Study";
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      if (validateInputs && validateInputs.length > 0) {
        if (navigationElementList && navigationElementList.length > 0) {
          navigationElementList[0].style.display = 'none';
        }
        validateInputs.forEach(function (input) {
          updateNavigation();
          if (input.tagName == 'SELECT') {
            input.addEventListener('change', function () {
              validateInput(input);
              updateNavigation();
            });
          } else if (input.tagName == 'INPUT') {
            input.addEventListener('input', function () {
              validateInput(input);
              updateNavigation();
            });
          }
        });
      }

      if ((currentSection.querySelector("#charge_credit_card") && !userData["payment_status"]) ||
        (currentSection.querySelector("#calendly_div") && !userData["Sleep_Consultation_Date_Patient"])) {
        if (navigationElementList && navigationElementList.length > 0) {
          navigationElementList[0].style.display = 'none';
        }
      }

      if (checkAllMandatoryFieldsCompleted(orderMandatoryFields) && !localStorage.getItem("order")) {
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
                showCustomAlert('Error', response.message, false);
              } else if (response.status == 200 && response.data) {
                if (Object.entries(response.data.data).length > 0 && response.data.data.insuranceInfo) {
                  localStorage.setItem("order", JSON.stringify(response.data.data));
                  userData["orderId"] = response.data.data.orderId;
                  localStorage.setItem("userData", JSON.stringify(userData));

                  openCalendly('schedule');
                  showCustomAlert('Success', response.message, true);
                }
              }
            }).catch(error => {
              showCustomAlert('Error', error.message, false);
            });
        } catch (error) {
          console.error('Error:', error.message);
        }
      }

      if (localStorage.getItem("order") && document.getElementById('calendly_div').children.length == 0) {
        openCalendly('schedule');
      }

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

      function validateInput(input) {
        var dataType = input.getAttribute('data-type');
        var value = input.value.trim();

        switch (dataType) {
          case 'text':
            return value !== '';
          case 'email':
            return /^.+@.+\..+$/.test(value);
          case 'tel':
            return /^[0-9]{11}$/.test(value);
          case 'credit-card':
            return /^[0-9]{16}$/.test(value);
          case 'security-code':
            return /^[0-9]{4}$/.test(value);
          case 'amount':
            return parseFloat(value) > 0;
          case 'zip':
            let transformedInput = value.replace(/[^0-9.]+/g, "");

            if (transformedInput.length > 5) {
              transformedInput = transformedInput.slice(0, 5) + "-" + transformedInput.slice(5, 10);
            } else if (transformedInput.length === 5) {
              transformedInput = transformedInput.replace('-', '');
            }

            input.value = transformedInput.slice(0, 10);
            return input.value.length >= 5;
          case 'select':
            return value != 'default';
          case 'date':
            return value !== '';
          default:
            return true;
        }
      }

      function updateNavigation() {
        var isFormValid = Array.from(validateInputs).every(function (input) {
          return validateInput(input);
        });

        if (isFormValid) {
          const storedData = localStorage.getItem('userData');
          const userData = storedData ? JSON.parse(storedData) : {};

          validateInputs.forEach(function (input) {
            input.value != null && input.value != "" ? (userData[input.name] = input.value) : delete userData[input.name];
          });

          localStorage.setItem('userData', JSON.stringify(userData));
          replacePlaceholders(userData);

          document.getElementsByClassName("navigate-right")[0].style.display = 'block';
        } else {
          document.getElementsByClassName("navigate-right")[0].style.display = 'none';
        }
      }

    });

    //---------------------------------------------------------------------//
  }

  function replaceFieldData(userData) {
    inputFields.forEach(element => {
      if (element.tagName == 'SELECT') {
        element.value = userData[element.name] || 'default';
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
      indexh: 0,  //3 number slide is for restart the presentation
      indexv: 0,
      overview: false,
      paused: false
    });
    closeCustomPopup();
  }

  function openPersonalInformation() {
    Reveal.setState({
      indexh: 15,  //18 number slide is for personal information
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
                document.getElementsByClassName("navigate-right")[0].style.display = 'block';
              } else if (calendlyEvent == 'cancel') {
                if (!response.insuranceInfo.coverageReviewAppointmentId) {
                  delete userData["Sleep_Consultation_Date_Patient"];
                  delete userData["Sleep_Consultation_Time_Patient"];

                  localStorage.setItem('userData', JSON.stringify(userData));
                  replacePlaceholders(userData);
                  clearInterval(intervalId);
                  document.getElementsByClassName("navigate-right")[0].style.display = 'block';
                }
              }
              if (Object.keys(leadData).length > 0) {
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
    const calendlyDivElement = document.getElementById("calendly_div");
    if (calendlyDivElement) {
      const sectionElements = document.querySelectorAll('section');

      for (let i = 0; i < sectionElements.length; i++) {
        const sectionElement = sectionElements[i];

        if (sectionElement.contains(calendlyDivElement)) {
          Reveal.setState({
            indexh: i,  //go to calendly widget slide
            indexv: 0,
            overview: false,
            paused: false
          });
          break;
        }
      }
    }
  }
  //----------------------------------------------------------------------------------------------//

  //------------------ alert pop up-------------------------------------------//
  function showCustomAlert(heading, message, success) {
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
              showCustomAlert('Error', response.message, false);
              button.disabled = false;
            } else if (response.status == 200 && response.data) {
              if (Object.entries(response.data.data).length > 0 && Object.entries(response.data.data.paymentInfo).length > 0) {
                openCalendly('schedule');
                localStorage.setItem("order", JSON.stringify(response.data.data));
                showCustomAlert('Success', response.message, true);
                userData["payment_status"] = "fulfilled";
                localStorage.setItem("userData", JSON.stringify(userData));
                document.getElementsByClassName("navigate-right")[0].style.display = 'block';
              }
            }
            loader.parentNode.removeChild(loader);
          }).catch(error => {
            showCustomAlert('Error', error.message, false);
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

});


