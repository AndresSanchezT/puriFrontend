import { isDevMode } from "@angular/core";

export const environment = {
  production: !isDevMode(),
  baseUrl: isDevMode()
    ? 'https://rg-sistemaspuri-c9bja3brafeydwfq.canadacentral-01.azurewebsites.net/api'
    : 'https://rg-sistemaspuri-c9bja3brafeydwfq.canadacentral-01.azurewebsites.net/api',
};





