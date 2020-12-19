import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class UtilitiesService {
  constructor() {}
  arrayOfLength(n: number) {
    return Array.from(Array(n).keys());
  }
}
