function initContactPage() {
    const openButton = document.getElementById('openContactDialog');
    const contactDialog = document.getElementById('contactDialog');

    if (!openButton || !contactDialog) {
        return false;
    }

    if (openButton.dataset.dialogInit === 'true') {
        return true;
    }

    openButton.addEventListener('click', () => {
        contactDialog.open = true;
    });

    const closeButtons = contactDialog.querySelectorAll('[dialog-action="close"]');
    closeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            contactDialog.close();
        });
    });
    openButton.dataset.dialogInit = 'true';

    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    initContactPage();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initContactPage
    };
}
