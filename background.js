browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "addToAnki") {
      fetch("http://localhost:8765", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload)
      })
        .then(response => response.json())
        .then(data => sendResponse(data))
        .catch(error => sendResponse({ error: error.message }));
  
      return true;
    } else if (message.action === "fetchImage") {
      fetch(message.url)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ base64: reader.result.split(",")[1] });
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => sendResponse({ error: error.message }));
  
      return true;
    }
  });