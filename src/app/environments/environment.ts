import { isDevMode } from "@angular/core";

export const environment = {
  production: !isDevMode(),
  baseUrl: isDevMode()
    ? 'http://localhost:8080/api'
    : 'https://rg-sistemaspuri-c9bja3brafeydwfq.canadacentral-01.azurewebsites.net/api',
};





