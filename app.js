// Quando la pagina è pronta
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".app-button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionName = btn.textContent?.trim() || "Sezione";
      alert(`Qui in futuro apriremo la sezione: ${sectionName}`);
      console.log("Pulsante cliccato:", sectionName);
    });
  });
});
