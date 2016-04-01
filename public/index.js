'use strict';

var container = document.querySelector('.container');
var del = document.querySelector('.delete');
var formAdd = document.querySelector('.add');
var reload = document.querySelector('.reload');
var countMove = 0;
var names = [];
var order = 0;
var currentOrder;
var interval;
var stack = [];

var target;
var lastEvent;

var formSave;
var noteSave;
var delItem;

var direction = 'x';
var oldShadow;

function xhrRequest(method, puth, hundler, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, puth, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    if (body) {
        xhr.send(body);
    } else {
        xhr.send();
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState != 4) return;
        if (xhr.status != 200) {
            alert(xhr.status + ': ' + xhr.statusText);
        } else {
            hundler(JSON.parse(xhr.response));
        }
    }
}

function createNote(text) {
    var item = document.createElement('div');
    item.setAttribute('class', 'container__item');
    item.style.order = order;
    order += 1;
    names.push(item);

    var p = document.createElement('p');
    p.setAttribute('class', 'container__item__text');
    p.innerText = text;

    item.appendChild(p);
    container.appendChild(item);
}

function resetFormSave() {
    noteSave.removeChild(formSave);
    noteSave.childNodes[0].style.display = 'inline';
    formSave = undefined;
}

function resetDel() {
    del.style.display = 'none';
    del.style.top = 0;
    del.style.left = 0;
}

function resetTransform() {
    if (target && target.closest('.container__item')) {
        target.closest('.container__item').style.transform = 'translateX(' + 0 + ')';
    }
}

function createFormSave(note, noteText) {
    var form = document.createElement('form');
    var inputText = document.createElement('input');
    var inputBtn = document.createElement('input');
    formSave = form;
    noteSave = note;

    form.setAttribute('method', 'post');
    form.setAttribute('action', '/change-note');
    form.setAttribute('class', 'save');

    inputText.setAttribute('value', noteText);
    inputText.setAttribute('type', 'text');
    inputText.setAttribute('class', 'save__text');

    inputBtn.setAttribute('type', 'submit');
    inputBtn.setAttribute('value', 'Save');
    inputBtn.setAttribute('class', 'save__btn');

    note.appendChild(form);
    form.appendChild(inputText);
    form.appendChild(inputBtn);

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var text = document.querySelector('.save__text').value;
        var name = noteSave.childNodes[0].innerText;
        var body = 'name=' + encodeURIComponent(name) + '&changeNote=' + encodeURIComponent(text);

        xhrRequest('PUT', '/change-note', function (response) {
            noteSave.childNodes[0].innerText = response.name;
            resetFormSave();
        }, body);
    }, false);
}

function createDel() {
    del.style.display = 'block';
    del.style.top = target.offsetTop + 'px';
    del.style.left = target.offsetWidth * 0.8 + target.offsetLeft + 'px';
    del.style.height = target.offsetHeight + 'px';
}

function createNotfound() {
    var p = document.createElement('p');
    p.innerHTML = "Notes not found";
    p.setAttribute('class', 'container__notfound');

    container.appendChild(p);
}

function resetNotfound() {
    if (names.length === 0) {
        container.removeChild(container.childNodes[0]);
    }
}

function swipe(xAbs, yAbs, event) {
    if (xAbs > yAbs) {
        //Свайп влево
        if (finalPoint.pageX < initialPoint.pageX && finalPoint.target.closest('.container__item')
            && direction === 'x') {
            target = finalPoint.target.closest('.container__item');
            target.style.transform = 'translateX(-' + 20 + '%)';
            createDel();
        }
    } else {
        if (finalPoint.pageY > initialPoint.pageY && finalPoint.pageY < document.documentElement.clientHeight) {
            //Свайп вниз
            event.preventDefault();
            document.body.style.marginTop = 0;
            //get notes
            xhrRequest('GET', '/list-notes', function (response) {
                setTimeout(function () {
                    document.body.style.marginTop = -40 + 'px';
                }, 500);

                render(response);
            });
        }
    }
}

function replace() {
    if (target.closest('.container__item') && !formSave) {
        direction = 'y';
        target.closest('.container__item').style.transform = 'scale(1.1)';
        currentOrder = target.closest('.container__item').style.order - 0;
        stack.push(target.closest('.container__item'));
    }
}

function initOrder() {
    var items = container.childNodes;
    for (var i = 0; i < items.length - 1; i += 2) {
        names.push(items[i].nextElementSibling);
        items[i].nextElementSibling.style.order = order;
        order += 1;
    }
    interval = items[1].offsetTop - items[3].offsetTop;
}

function render(resNames) {
    //массив объектов с полем name
    resetNotfound()
    order = 0;
    names.forEach(function (name) {
        container.removeChild(name);
    });
    names = [];

    if (resNames.length === 0) {
        createNotfound();
    }

    resNames.forEach(function (name) {
        createNote(name.name);
    })
}

function condition(touch, step) {
    if (stack.indexOf(names[currentOrder + step]) > - 1) {
        return touch.pageY < stack[stack.length - 2].offsetTop + stack[stack.length - 2].offsetHeight / 2 &&
            touch.pageY > stack[stack.length - 2].offsetTop;
    }
    return touch.pageY < names[currentOrder + step].offsetTop + names[currentOrder + step].offsetHeight / 2 &&
        touch.pageY > names[currentOrder + step].offsetTop;
}

function stepOfShift(step) {
    var item = target.closest('.container__item');
    if (stack.indexOf(names[currentOrder + step]) > -1) {
        names[currentOrder + step].style.transform = "translateY(" + 0 + "px)";
        names[currentOrder] = stack.pop();
        names[currentOrder + step] = item;
    } else {
        stack.push(names[currentOrder + step]);
        names[currentOrder + step] = item;
        names[currentOrder] = stack[stack.length - 1];
        names[currentOrder].style.transform = "translateY(" + (step * interval) + "px)";
    }
    currentOrder += step;
}

function shift(touch) {
    if (currentOrder > 0) {
        if (condition(touch, -1)) {
            stepOfShift(-1);
        }
    }
    if (currentOrder < names.length - 1) {
        if (condition(touch, 1)) {
            stepOfShift(1);
        }
    }
}

function removeName(target) {
    var index = names.indexOf(target);
    names.splice(index, 1);
}

formAdd.addEventListener('submit', function (event) {
    event.preventDefault();

    var note = document.querySelector('#input_text').value;
    if (!note) {
        return;
    }
    var body = 'name=' + encodeURIComponent(note);

    xhrRequest('POST', '/add-note', function (response) {
        resetNotfound();
        createNote(response.name);
        document.querySelector('#input_text').value = '';
    }, body);
});

del.addEventListener('touchstart', function (event) {
    event.preventDefault();

    var name = target.childNodes[0].innerText;
    var body = 'name=' + encodeURIComponent(name);

    xhrRequest('DELETE', 'delete-note', function() {
        container.removeChild(target);
        resetDel();
        removeName(target);
    }, body);

    event.stopPropagation();
}, false);


var touchOffsetX;
var touchOffsetY;

var initialPoint;
var finalPoint;

var lastX;
var lastY;

var longTouch;


document.addEventListener('touchstart', function (event) {
    if (event.targetTouches.length === 1) {
        initialPoint = event.changedTouches[0];
        var touch = event.targetTouches[0];

        if (!touch.target.closest('.save') && formSave) {
            resetFormSave();
        }

        if (touch.target.closest('.delete')) {
            return;
        }

        if (target) {
            resetDel();
            resetTransform();
        }

        target = touch.target;

        event.preventDefault();

        longTouch = setTimeout(replace, 300);

        touchOffsetX = touch.pageX;
        touchOffsetY = touch.pageY;

        lastEvent = 'touchstart';
    }
}, false);


container.addEventListener('touchmove', function (event) {
    if (formSave) {
        return;
    }

    if (event.targetTouches.length == 1 && countMove > 5) {
        var touch = event.targetTouches[0];
        var touchTarget = touch.target;

        var item = touchTarget.closest('.container__item');

        if (!item) {
            return;
        }
        event.preventDefault();

        if (direction === 'x') {
            item.style.transform = "translateX(" + (touch.pageX - touchOffsetX) + "px)";
            event.stopPropagation();
        } else {
            item.style.transform = "translateY(" + (touch.pageY - touchOffsetY) + "px) " + "scale(1.1)";
            shift(touch);
        }

        lastEvent = 'touchmove';
    }

    clearTimeout(longTouch);
    countMove += 1;
}, false);

container.addEventListener('touchend', function (event) {
    if (event.changedTouches.length == 1 && lastEvent === 'touchstart') {

        if (target.className !== 'container__item' &&
            target.className !== 'container__item__text') {
            return;
        }

        var note;
        var text;
        if (target.className === 'container__item') {
            note = target;
            text = target.childNodes[0];
        } else {
            note = target.parentNode;
            text = target;
        }

        if (direction == 'x') {
            createFormSave(note, text.innerText);
            text.style.display = 'none';
        }

        event.stopPropagation();
        countMove = 0;
    }
}, false);

document.addEventListener('touchend', function (event) {
    finalPoint = event.changedTouches[0];
    clearTimeout(longTouch);

    resetTransform();

    if (finalPoint.target.closest('.container__del') || formSave) {
        return;
    }
    resetDel();

    if (direction == 'y') {
        var item = target.closest('.container__item');
        stack.forEach(function (elem) {
            if (elem.style.order > item.style.order) {
                elem.style.order -= 1;
                item.style.order = item.style.order - 0 + 1;
            } else if (elem.style.order < item.style.order) {
                elem.style.order = elem.style.order - 0 + 1;
                item.style.order -= 1;
            }
            elem.style.transform = "translateY(" + 0 + "px)";
        });
        stack = [];
        direction = 'x';

        var body = '';
        var i = 0;
        names.forEach(function (name) {
            if (i === 0) {
                body += 'name_' + i + "=" + encodeURIComponent(name.childNodes[0].innerHTML);
            } else {
                body += '&name_' + i + "=" + encodeURIComponent(name.childNodes[0].innerHTML);
            }

            i ++;
        });
        xhrRequest('PUT', '/change-chain', function (response) {
            render(response);
        }, body);
        return;
    }

    var xAbs = Math.abs(initialPoint.pageX - finalPoint.pageX);
    var yAbs = Math.abs(initialPoint.pageY - finalPoint.pageY);
    if (xAbs > 50 || yAbs > 50) {
        swipe(xAbs, yAbs, event);
    }
}, false);

initOrder();
