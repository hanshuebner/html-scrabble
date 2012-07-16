function loadAddressBook() {
    var addressBook = [];
    if (localStorage.getItem('addressBook')) {
        addressBook = JSON.parse(localStorage.getItem('addressBook'));
    }
    return addressBook;
}

function saveAddressBook(addressBook) {
    localStorage.setItem('addressBook', JSON.stringify(addressBook));
}

function lookupName(adddressBook, name) {
    for (var i in adddressBook) {
        var entry = adddressBook[i];
        if (entry.name.toLowerCase() == name.toLowerCase()) {
            return entry;
        }
    }
    return null;
}

function setName(addressBook, name, email) {
    var entry = lookupName(addressBook, name);
    if (entry) {
        entry.name = name;
        entry.email = email;
    } else {
        addressBook.push({ name: name, email: email });
    }
}

$(document).ready(function() {
    var addressBook = loadAddressBook();
    $('input.name')
        .autocomplete({
            source: addressBook.map(function(entry) { return entry.name; })
        })
        .blur(function() {
            var entry = lookupName(addressBook, $(this).val());
            if (entry) {
                $(this).siblings('input').val(entry.email);
            }
        });
    
    $('form').on('submit', function(event) {
        var valid = true;
        var playerCount = 0;
        var firstEmptyPath;
        [1, 2, 3, 4].forEach(function(index) {
            var namePath = 'input[name=name' + index +']';
            var name = $(namePath).val();
            var emailPath = 'input[name=email' + index +']';
            var email = $(emailPath).val();
            if (!firstEmptyPath && !name) {
                firstEmptyPath = namePath;
            }
            if (!firstEmptyPath && !email) {
                firstEmptyPath = emailPath;
            }
            if (name && !email) {
                $(emailPath).focus();
                value = false;
            } else if (email && !name) {
                $(namePath).focus();
                value = false;
            } else if (name && email) {
                setName(addressBook, name, email);
                playerCount++;
            }
        });
        saveAddressBook(addressBook);
        return playerCount >= 2;
    });
    $('input').first().focus();
});