const pdfInput = document.getElementById('pdf-upload');
const imageInput = document.getElementById('image-upload');
const processButton = document.getElementById('process');

processButton.addEventListener('click', async () => {
    if (!pdfInput.files.length || !imageInput.files.length) {
        alert('رجاءً اختر ملف PDF وصورة.');
        return;
    }

    const pdfBytes = await pdfInput.files[0].arrayBuffer();
    const imageBytes = await imageInput.files[0].arrayBuffer();

    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const image = await pdfDoc.embedPng(imageBytes); 
    const imageDims = image.scale(0.13);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawImage(image, {
            x: (width - imageDims.width) / 2,  
            y: (height - imageDims.height) / 2, 
            width: imageDims.width,
            height: imageDims.height,
            opacity: 0.23,
        });
    }

    const pdfBytesNew = await pdfDoc.save();

    const blob = new Blob([pdfBytesNew], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "حقوق " + pdfInput.files[0].name;
    link.click();
});
