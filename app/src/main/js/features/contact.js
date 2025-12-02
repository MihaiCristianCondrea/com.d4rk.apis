function initContactPage() {
    const openButton = document.getElementById('openContactDialog');
    const contactDialog = document.getElementById('contactDialog');
    const emailButton = document.getElementById('contactEmailAction');

    const closeCurrentDialog = () => {
        if (!contactDialog) {
            return;
        }
        if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.closeDialog === 'function') {
            AppDialogs.closeDialog(contactDialog);
        } else if (typeof contactDialog.close === 'function') {
            contactDialog.close();
        } else {
            contactDialog.open = false;
        }
    };

    if (!openButton || !contactDialog) {
        return false;
    }

    if (openButton.dataset.dialogInit === 'true') {
        return true;
    }

    openButton.addEventListener('click', () => {
        if (typeof AppDialogs !== 'undefined' && AppDialogs && typeof AppDialogs.rememberTrigger === 'function') {
            AppDialogs.rememberTrigger(contactDialog, openButton);
        }
        contactDialog.open = true;
    });

    if (emailButton) {
        emailButton.addEventListener('click', () => {
            window.location.href = 'mailto:contact.mihaicristiancondrea@gmail.com';
            closeCurrentDialog();
        });
    }

    const closeButtons = contactDialog.querySelectorAll('[dialog-action="close"]');
    closeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeCurrentDialog();
        });
    });
    openButton.dataset.dialogInit = 'true';

    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    initContactPage();
});
