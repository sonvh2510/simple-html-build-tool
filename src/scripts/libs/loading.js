const body = document.body;
const loaderElement = document.querySelector('#loader-container');
const progressBar = loaderElement.querySelector('#loader-progress-bar');
const progressPercentage = loaderElement.querySelector('#loader-percent');

const disableLoadingScreen = (resolve) => {
  loaderElement.style.transition = 'all 0.3s linear';
  loaderElement.style.opacity = '0';
  loaderElement.style.visibility = 'hidden';
  setTimeout(() => {
    loaderElement.parentNode.removeChild(loaderElement);
    body.classList.add('show-page');
    resolve();
  }, 500);
};

export const Loading = () => {
  return new Promise((resolve) => {
    const images = document.images;
    const imagesLength = images.length;
    let counter = 0;

    if (!loaderElement) return disableLoadingScreen(resolve);
    if (imagesLength === 0) return disableLoadingScreen(resolve);

    const progressing = () => {
      counter += 1;
      const n = Math.round((100 / imagesLength) * counter);

      if (progressBar) {
        progressBar.style.width = `${n}%`;
      }
      if (progressPercentage) {
        progressPercentage.innerHTML = `${n}`;
      }
      if (counter === imagesLength) {
        return disableLoadingScreen(resolve);
      }
    };

    for (let i = 0; i < imagesLength; i++) {
      const img = new Image();
      img.onload = progressing;
      img.onerror = progressing;
      img.src = images[i].src;
    }
  });
};
