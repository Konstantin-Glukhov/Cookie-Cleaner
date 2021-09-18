"use strict";
import { refreshOptions, saveOptions } from "./storage.js";

document.addEventListener("DOMContentLoaded", refreshOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("cancel").addEventListener("click", () => {
  window.close();
});