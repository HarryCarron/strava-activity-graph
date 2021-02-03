import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ActivityGraphService {

  renderer;
  dynamicElementColor;
  gridColor;
  constructor() {}


  public getWeekPoint() {
    const weekPoint = this.renderer.createElement('circle', 'svg');
    this.renderer.setAttribute(weekPoint, 'r',              '3');
    this.renderer.setAttribute(weekPoint, 'fill',           'white');
    this.renderer.setAttribute(weekPoint, 'stroke',         this.dynamicElementColor);
    this.renderer.setAttribute(weekPoint, 'stroke-width',   '2');

    return weekPoint;
  }

}
