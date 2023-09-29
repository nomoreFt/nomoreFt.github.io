/*
dropdown이 default로 닫혀있을 경우
function spread(count){
    document.getElementById('folder-checkbox-' + count).checked =
        !document.getElementById('folder-checkbox-' + count).checked
    document.getElementById('spread-icon-' + count).innerHTML =
        document.getElementById('spread-icon-' + count).innerHTML == 'arrow_right' ?
            'arrow_drop_down' : 'arrow_right'
}
*/


/*
dropdown이 default로 열려있을 경우
 */
function spread(count){
    document.getElementById('folder-checkbox-' + count).checked =
        !document.getElementById('folder-checkbox-' + count).checked;
    document.getElementById('spread-icon-' + count).innerHTML =
        document.getElementById('spread-icon-' + count).innerHTML == 'arrow_drop_down' ?
            'arrow_right' : 'arrow_drop_down';
}
