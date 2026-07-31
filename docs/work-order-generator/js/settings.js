/* =========================================
   SETTINGS MODULE
========================================= */

const SETTINGS_RECORD_ID = "company_profile";

/* =========================================
   INITIALIZE SETTINGS
========================================= */

async function initializeSettings() {

    try {

        const settings =
            await getRecord(
                "settings",
                SETTINGS_RECORD_ID
            );

        if (settings) {

            populateSettingsForm(
                settings
            );

        }

    }
    catch (error) {

        console.error(
            "Failed to load settings:",
            error
        );

    }

}

/* =========================================
   POPULATE FORM
========================================= */

function populateSettingsForm(
    settings
) {

    document.getElementById(
        "companyName"
    ).value =
        settings.companyName || "";

    document.getElementById(
        "companyPhone"
    ).value =
        settings.companyPhone || "";

    document.getElementById(
        "companyEmail"
    ).value =
        settings.companyEmail || "";

    document.getElementById(
        "companyWebsite"
    ).value =
        settings.companyWebsite || "";

    document.getElementById(
        "companyAddress"
    ).value =
        settings.companyAddress || "";

    document.getElementById(
        "companyRep"
    ).value =
        settings.companyRep || "";

}

/* =========================================
   COLLECT FORM DATA
========================================= */

function getSettingsFormData() {

    return {

        id:
            SETTINGS_RECORD_ID,

        companyName:
            document.getElementById(
                "companyName"
            ).value.trim(),

        companyPhone:
            document.getElementById(
                "companyPhone"
            ).value.trim(),

        companyEmail:
            document.getElementById(
                "companyEmail"
            ).value.trim(),

        companyWebsite:
            document.getElementById(
                "companyWebsite"
            ).value.trim(),

        companyAddress:
            document.getElementById(
                "companyAddress"
            ).value.trim(),

        companyRep:
            document.getElementById(
                "companyRep"
            ).value.trim(),

        updatedDate:
            new Date().toISOString()

    };

}

/* =========================================
   SAVE SETTINGS
========================================= */

async function saveSettings() {

    try {

        const data =
            getSettingsFormData();

        await updateRecord(
            "settings",
            data
        );

        alert(
            "Company settings saved successfully."
        );

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            "Failed to save settings."
        );

    }

}

/* =========================================
   GET COMPANY PROFILE
========================================= */

async function getCompanyProfile() {

    try {

        const settings =
            await getRecord(
                "settings",
                SETTINGS_RECORD_ID
            );

        return settings || {

            companyName: "",
            companyPhone: "",
            companyEmail: "",
            companyWebsite: "",
            companyAddress: "",
            companyRep: ""

        };

    }
    catch (error) {

        console.error(
            error
        );

        return {

            companyName: "",
            companyPhone: "",
            companyEmail: "",
            companyWebsite: "",
            companyAddress: "",
            companyRep: ""

        };

    }

}

/* =========================================
   CLEAR SETTINGS FORM
========================================= */

function clearSettingsForm() {

    document.getElementById(
        "companyName"
    ).value = "";

    document.getElementById(
        "companyPhone"
    ).value = "";

    document.getElementById(
        "companyEmail"
    ).value = "";

    document.getElementById(
        "companyWebsite"
    ).value = "";

    document.getElementById(
        "companyAddress"
    ).value = "";

    document.getElementById(
        "companyRep"
    ).value = "";

}

/* =========================================
   SETTINGS EVENTS
========================================= */

function initializeSettingsEvents() {

    const saveButton =
        document.getElementById(
            "saveSettingsBtn"
        );

    if (!saveButton)
        return;

    saveButton.addEventListener(
        "click",
        saveSettings
    );

}

/* =========================================
   SETTINGS STARTUP
========================================= */

async function startSettingsModule() {

    await initializeSettings();

    initializeSettingsEvents();

}