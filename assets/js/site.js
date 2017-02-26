$(document).ready(function () {
	$('li').click(function () {
        $(this).siblings().removeClass('active');
		$(this).addClass('active');
    });

    $('table').addClass('table');
});