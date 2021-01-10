import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ActivityGraphService {

  renderer;
  dynamicElementColor;
  gridColor;
  constructor() {}

  public getActiveWeekLine() {
    // todo: this method should only init and return activeWeekLine, coords should be set after init
    const activeLine = this.renderer.createElement('line',        'svg');
    // this.renderer.setAttribute(_activeLine, 'x1',                 this.rightLimit.toString());
    // this.renderer.setAttribute(_activeLine, 'y1',                 (this.floorLimit + this.cielLimit).toString());
    // this.renderer.setAttribute(_activeLine, 'x2',                 this.rightLimit.toString());
    // this.renderer.setAttribute(_activeLine, 'y2',                 this.cielLimit.toString());
    this.renderer.setAttribute(activeLine, 'stroke',              this.dynamicElementColor);
    this.renderer.setAttribute(activeLine, 'stroke-width',        '2');
    this.renderer.setAttribute(activeLine, 'stroke-linecap',      'round');
    this.renderer.setAttribute(activeLine, 'id',                  'active-week-line');

    return activeLine;
  }

  public getActivePoint(pulseAnimation?: boolean) {
    const activeWeekPoint = this.renderer.createElement('circle',         'svg');
    const activeWeekPointAccent = this.renderer.createElement('circle',   'svg');
    this.renderer.setAttribute(activeWeekPoint, 'r',                      '4');
    this.renderer.setAttribute(activeWeekPoint, 'fill',                   this.dynamicElementColor);
    this.renderer.setAttribute(activeWeekPoint, 'id',                     'active-point');

    this.renderer.setAttribute(activeWeekPointAccent, 'fill',             this.dynamicElementColor);
    this.renderer.setAttribute(activeWeekPointAccent, 'fill-opacity',     '0.3');
    this.renderer.setAttribute(activeWeekPointAccent, 'r',                '8');
    this.renderer.setAttribute(activeWeekPointAccent, 'id',               'active-point-accent');

    if (pulseAnimation) {
      const animateSize = this.renderer.createElement('animate',          'svg');
      this.renderer.setAttribute(animateSize, 'attributeName',            'r');
      this.renderer.setAttribute(animateSize, 'values',                   '5;8');
      this.renderer.setAttribute(animateSize, 'dur',                      '1s');
      this.renderer.setAttribute(animateSize, 'repeatCount',              'indefinite');
      this.renderer.appendChild(activeWeekPointAccent,                    animateSize);
    }

    return [activeWeekPointAccent, activeWeekPoint];
  }

  private getAnimate(animateAttr: string) {
    const animation = this.renderer.createElement('animate', 'svg');
    this.renderer.setAttribute(animation, 'attributeName',  animateAttr);
    this.renderer.setAttribute(animation, 'repeatCount',    'infinite');
    this.renderer.setAttribute(animation, 'dur',    '0.5s');
    return animation;
  }

  public getWeekPoint() {
    const weekPoint = this.renderer.createElement('circle', 'svg');
    const weekPointAnimate = this.getAnimate('cy');
    this.renderer.setAttribute(weekPoint, 'r',              '3');
    this.renderer.setAttribute(weekPoint, 'fill',           'white');
    this.renderer.setAttribute(weekPoint, 'stroke',         this.dynamicElementColor);
    this.renderer.setAttribute(weekPoint, 'stroke-width',   '2');

    this.renderer.appendChild(weekPoint, weekPointAnimate);

    return [weekPoint, weekPointAnimate];
  }

  public getPath() {
    const path = this.renderer.createElement('path', 'svg');
    this.renderer.setAttribute(path, 'stroke',            this.dynamicElementColor);
    this.renderer.setAttribute(path, 'fill',              'none');
    this.renderer.setAttribute(path, 'stroke-width',      '2');
    this.renderer.setAttribute(path, 'stroke-linecap',    'round');
    return path;
  }

  public getFill() {
    const fill = this.renderer.createElement('path',      'svg');
    this.renderer.setAttribute(fill, 'stroke',            'none');
    this.renderer.setAttribute(fill, 'fill',              'url(#grad1)');
    this.renderer.setAttribute(fill, 'stroke-width',      '0');
    return fill;
  }

  public getBoundingRectangle() {
    const boundingRect = this.renderer.createElement('rect', 'svg');
    this.renderer.setAttribute(boundingRect, 'fill',     'none');
    this.renderer.setAttribute(boundingRect, 'stroke',   this.gridColor);
    return boundingRect;
  }

  public getGridLine() {
    const line = this.renderer.createElement('line', 'svg');
    this.renderer.setAttribute(line, 'stroke', this.gridColor);
    return line;
  }

  public getText(text: string) {
    const textContainer = this.renderer.createElement('text', 'svg');
    const textNode = this.renderer.createText(text);
    this.renderer.appendChild(textContainer,  textNode);
    this.renderer.setStyle(textContainer,     'font-size',  '8px');
    this.renderer.setAttribute(textContainer, 'fill',       '#A9A9A9');
    return textContainer;
  }

}
