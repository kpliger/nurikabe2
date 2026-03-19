

export const pasteClipboard = async(e, previewId:string, callback:Function) => {
  e.preventDefault();
  const clipboardItems = typeof navigator?.clipboard?.read === 'function' ? await navigator.clipboard.read() : e.clipboardData.files;

  for (const clipboardItem of clipboardItems) {
    let blob;
    if (clipboardItem.type?.startsWith('image/')) {
      // For files from `e.clipboardData.files`.
      blob = clipboardItem
      // Do something with the blob.
      appendImage(blob, previewId, callback);
    } else {
      // For files from `navigator.clipboard.read()`.
      const imageTypes = clipboardItem.types?.filter(type => type.startsWith('image/'))
      for (const imageType of imageTypes) {
        blob = await clipboardItem.getType(imageType);
        // Do something with the blob.
        appendImage(blob, previewId, callback);
      }
    }
  }
};

function appendImage(blob:any, previewId:string, callback?:Function) {
  const previewElement = document.getElementById(previewId);
  if(previewElement instanceof HTMLImageElement)
    previewElement.src = URL.createObjectURL(blob);

  const img = document.createElement("img");
  img.src = URL.createObjectURL(blob);
  img.onload = () => {
    callback(img);
  };
};




