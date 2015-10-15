$(document).ready(function () {
	$('li').click(function () {
        $(this).siblings().removeClass('active').addClass('active');
    });
});