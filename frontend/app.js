// frontend/app.js
const BACKEND_URL = "https://chem-ed-genius.onrender.com";

const chatBox = document.getElementById("chat-box");
const inputField = document.getElementById("user-input");
const sendButton = document.getElementById("send-btn");

async function sendMessage() {
  const userPrompt = inputField.value.trim();
  if (!userPrompt) return;

  appendMessage("You", userPrompt);
  inputField.value = "";

  appendMessage("Chem-Ed Genius", "Thinking...");

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt }),
    });

    const data = await response.json();
    document.querySelectorAll(".message").forEach((el) => {
      if (el.textContent === "Thinking...") el.remove();
    });

    if (data.text) appendMessage("Chem-Ed Genius", data.text);
    else appendMessage("Chem-Ed Genius", "⚠️ No response from AI.");
  } catch (err) {
    console.error("Error:", err);
    appendMessage("Chem-Ed Genius", "⚠️ Server error or network issue.");
  }
}

function appendMessage(sender, message) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender === "You" ? "user" : "bot");
  messageDiv.innerHTML = message
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendButton.addEventListener("click", sendMessage);
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
