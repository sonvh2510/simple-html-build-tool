import $http from './libs/http';

const getFormAndSubmit = () => {
	const form = new FormData();
	const formElement = document.querySelector('#form');
	formElement.querySelectorAll('[name]').forEach((input) => {
		if (input.getAttribute('type') != 'file') {
			const name = input.getAttribute('name');
			const value = input.value;
			form.append(name, value);
		} else {
			const name = input.getAttribute('name');
			Array.from(input.files).forEach((file, index) => {
				const value = file;
				form.append(name, value);
			});
		}
	});
	form.append('testr', 'asdasd');
	$http
		.post('http://localhost:3000/user/add', {
			callbacks: {
				onProgress: (data, progressCount) => {
					console.log(progressCount);
				},
			},
			body: form,
		})
		.subscribe((res) => {
			console.log(res);
		});
};

const btn = document.querySelector('#btn');
btn.addEventListener('click', () => {
	getFormAndSubmit();
});
