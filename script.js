const pdfInput = document.getElementById('pdf-upload');
const imageInput = document.getElementById('image-upload');
const coverFrontInput = document.getElementById('cover-front-upload');
const coverBackInput = document.getElementById('cover-back-upload');
const opacityInput = document.getElementById('opacity');
const scaleInput = document.getElementById('scale');
const autoCoverCheckbox = document.getElementById('auto-cover');
const processButton = document.getElementById('process');
const statusText = document.getElementById('status');

processButton.addEventListener('click', async () => {
    if (!pdfInput.files.length) {
        alert('رجاءً اختر ملف PDF.');
        return;
    }

    try {
        statusText.textContent = 'يرجى الانتظار...';
        processButton.disabled = true;

        const pdfBytes = await pdfInput.files[0].arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        let watermarkImage, coverFrontImage, coverBackImage;

        if (imageInput.files.length) {
            const watermarkBytes = await imageInput.files[0].arrayBuffer();
            watermarkImage = await embedImage(pdfDoc, watermarkBytes);
        }

        if (autoCoverCheckbox.checked) {
            const [frontRes, backRes] = await Promise.all([
                fetch('cover-front.jpg').then(res => res.arrayBuffer()),
                fetch('cover-back.jpg').then(res => res.arrayBuffer())
            ]);
            coverFrontImage = await embedImage(pdfDoc, frontRes);
            coverBackImage = await embedImage(pdfDoc, backRes);
        } else {
            if (coverFrontInput.files.length) {
                const coverFrontBytes = await coverFrontInput.files[0].arrayBuffer();
                coverFrontImage = await embedImage(pdfDoc, coverFrontBytes);
            }
            if (coverBackInput.files.length) {
                const coverBackBytes = await coverBackInput.files[0].arrayBuffer();
                coverBackImage = await embedImage(pdfDoc, coverBackBytes);
            }
        }

        const pages = pdfDoc.getPages();
        const opacity = parseFloat(opacityInput.value) || 0.2;
        const scale = parseFloat(scaleInput.value) || 0.13;

        if (watermarkImage) {
            for (const page of pages) {
                const { width, height } = page.getSize();
                const dims = watermarkImage.scale(scale);
                page.drawImage(watermarkImage, {
                    x: (width - dims.width) / 2,
                    y: (height - dims.height) / 2,
                    width: dims.width,
                    height: dims.height,
                    opacity: opacity,
                });
            }
        }

        if (coverFrontImage) {
            const frontPage = pdfDoc.addPage();
            const { width: fWidth, height: fHeight } = frontPage.getSize();
            const frontDims = getScaledDimensions(coverFrontImage, fWidth, fHeight);
            frontPage.drawImage(coverFrontImage, {
                x: (fWidth - frontDims.width) / 2,
                y: (fHeight - frontDims.height) / 2,
                width: frontDims.width,
                height: frontDims.height,
            });
        }

        if (coverBackImage) {
            const backPage = pdfDoc.addPage();
            const { width: bWidth, height: bHeight } = backPage.getSize();
            const backDims = getScaledDimensions(coverBackImage, bWidth, bHeight);
            backPage.drawImage(coverBackImage, {
                x: (bWidth - backDims.width) / 2,
                y: (bHeight - backDims.height) / 2,
                width: backDims.width,
                height: backDims.height,
            });
        }

        const newPdfDoc = await PDFLib.PDFDocument.create();

        if (coverFrontImage) {
            const [embeddedFront] = await newPdfDoc.copyPages(pdfDoc, [pdfDoc.getPageCount() - (coverBackImage ? 2 : 1)]);
            newPdfDoc.addPage(embeddedFront);
        }

        const originalPageCount = pdfDoc.getPageCount() - (coverFrontImage ? 1 : 0) - (coverBackImage ? 1 : 0);
        for (let i = 0; i < originalPageCount; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
            newPdfDoc.addPage(copiedPage);
        }

        if (coverBackImage) {
            const [embeddedBack] = await newPdfDoc.copyPages(pdfDoc, [pdfDoc.getPageCount() - 1]);
            newPdfDoc.addPage(embeddedBack);
        }

        const finalPdfBytes = await newPdfDoc.save();

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'حقوق ' + pdfInput.files[0].name;
        link.click();

        statusText.textContent = '✅ تم تنزيل الملف بنجاح.';
    } catch (error) {
        console.error(error);
        statusText.textContent = '❌ حدث خطأ أثناء المعالجة.';
    } finally {
        processButton.disabled = false;
    }
});

// دوال المساعدة
async function embedImage(pdfDoc, imageBytes) {
    try {
        return await pdfDoc.embedPng(imageBytes);
    } catch {
        return await pdfDoc.embedJpg(imageBytes);
    }
}

function getScaledDimensions(image, maxWidth, maxHeight) {
    const widthScale = maxWidth / image.width;
    const heightScale = maxHeight / image.height;
    const scale = Math.min(widthScale, heightScale);
    return {
        width: image.width * scale,
        height: image.height * scale
    };
}
