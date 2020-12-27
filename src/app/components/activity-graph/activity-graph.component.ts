import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Renderer2,

} from '@angular/core';
import { TwelveWeekData } from './../../app.component';

const CIEL_PAD = 10;
const GRID_PAD = 15;
const FLOOR_PAD = 30;

const GRID_COLOR = '#E8E8E8';
const DYNAMIC_ELEMENT_COLOR = '#FC4C03';

@Component({
  selector: 'app-activity-graph',
  templateUrl: './activity-graph.component.html',
  styleUrls: ['./activity-graph.component.css'],
})
export class ActivityGraphComponent implements AfterViewInit {
  currentlyDragging = false;
  activePoint: [any, any];
  posFromLeft: number;
  xGraphTravel: number;
  weekContainerTravel: number;
  weekUnit: number;
  constructor(private renderer: Renderer2) {}

  private cielLimit: number;
  private floorLimit: number = GRID_PAD;
  private leftLimit: number = GRID_PAD;
  private rightLimit: number;

  private globalListen;

  private activeWeekLine;

  get highestWeeklyDistance(): string {
    return `${ (this.data.highestWeeklyDistance / 1000).toFixed(1) } km`;
  }

  private weekPoints = [];

  private _graph;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;

  @ViewChild('graph', { static: true })
  set graph(g) {
    this._graph = g.nativeElement;
  }

  @Input() data: TwelveWeekData;

  private _mouseLocation: number;

  private setDimensions(): void {
    this.renderer.setAttribute(
      this._graph,
      'height',
      this.graphContainer.nativeElement.offsetHeight
    );
    this.renderer.setAttribute(
      this._graph,
      'width',
      this.graphContainer.nativeElement.offsetWidth
    );

    this.cielLimit = CIEL_PAD;
    this.floorLimit = this.graphContainer.nativeElement.offsetHeight - FLOOR_PAD;
    this.rightLimit = this.graphContainer.nativeElement.offsetWidth + this.leftLimit - GRID_PAD * 2;
    this.posFromLeft = this.getLeftScreenPosition();
    this.xGraphTravel = 265.1 / 100;
    this.weekContainerTravel = 295 * 12 / 100;
  }

  weeklyDistance(distance): string {
    return `${(distance / 1000).toFixed(1)} km`;
  }


  private renderStaticContent(): void {
    const getLine = () => {
      const line = this.renderer.createElement('line', 'svg');
      this.renderer.setAttribute(line, 'stroke', GRID_COLOR);
      return line;
    };

    const gridOuter = this.renderer.createElement('rect', 'svg');
    this.renderer.setAttribute(gridOuter, 'x',        this.leftLimit.toString());
    this.renderer.setAttribute(gridOuter, 'y',        this.cielLimit.toString());
    this.renderer.setAttribute(gridOuter, 'stroke',   GRID_COLOR);
    this.renderer.setAttribute(gridOuter, 'fill',     'none');
    this.renderer.setAttribute(gridOuter, 'width',    (this.rightLimit - this.leftLimit).toString());
    this.renderer.setAttribute(gridOuter, 'height',   (this.floorLimit - this.cielLimit).toString()
    );
    this.renderer.appendChild(this._graph, gridOuter);

    this.data.weeks.forEach((week, i: number) => {
      const line = getLine();
      this.renderer.setAttribute(line, 'stroke',  GRID_COLOR);
      this.renderer.setAttribute(line, 'x1',      (this.leftLimit + 24.1 * i).toString());
      this.renderer.setAttribute(line, 'y1',      this.floorLimit.toString());
      this.renderer.setAttribute(line, 'x2',      (this.leftLimit + 24.1 * i).toString());
      this.renderer.setAttribute(line, 'y2',      this.cielLimit.toString());
      this.renderer.appendChild(this._graph,      line);

      if (week.isBeginingOfMonth) {

        const textContainer = this.renderer.createElement('text', 'svg');
        const text = this.renderer.createText(week.monthShort.toUpperCase());
        this.renderer.appendChild(textContainer,  text);
        this.renderer.setAttribute(textContainer, 'x',          (this.leftLimit + 24.1 * i - 7).toString());
        this.renderer.setAttribute(textContainer, 'y',          (this.floorLimit + 18).toString());
        this.renderer.setStyle(textContainer,     'font-size',  '8px');
        this.renderer.setAttribute(textContainer, 'fill',       '#A9A9A9');
        this.renderer.appendChild(this._graph, textContainer);

      }
    });
  }

  private renderDynamicContent(): void {

    const getWeekPoint = () => {
      const weekPoint = this.renderer.createElement('circle', 'svg');
      this.renderer.setAttribute(weekPoint, 'r',            '3');
      this.renderer.setAttribute(weekPoint, 'fill',         'white');
      this.renderer.setAttribute(weekPoint, 'stroke',       DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(weekPoint, 'stroke-width', '2');
      return weekPoint;
    };

    /**
     * The active point has two components, the solid orange center,
     * and a low opacity larger point directly below it
     */
    const getActivePoints = (pulseAnimation: boolean): [any, any] => { // todo
      const activeWeekPoint = this.renderer.createElement('circle',         'svg');
      const activeWeekPointAccent = this.renderer.createElement('circle',   'svg');
      this.renderer.setAttribute(activeWeekPoint, 'r',                      '4');
      this.renderer.setAttribute(activeWeekPoint, 'fill',                   DYNAMIC_ELEMENT_COLOR);

      this.renderer.setAttribute(activeWeekPointAccent, 'fill',             DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(activeWeekPointAccent, 'fill-opacity',     '0.3');
      this.renderer.setAttribute(activeWeekPointAccent, 'r',                '8');
      if (pulseAnimation) {
        const animate = this.renderer.createElement('animate',              'svg');
        this.renderer.setAttribute(animate, 'attributeName',                'r');
        this.renderer.setAttribute(animate, 'values',                       '5;8');
        this.renderer.setAttribute(animate, 'dur',                          '1s');
        this.renderer.setAttribute(animate, 'repeatCount',                  'indefinite');
        this.renderer.appendChild(activeWeekPointAccent,                    animate);
      }

      return [activeWeekPointAccent, activeWeekPoint];
    };

    const getActiveWeekLine = () => {
      const _activeLine = this.renderer.createElement('line',       'svg');
      this.renderer.setAttribute(_activeLine, 'x1',                 this.rightLimit.toString());
      this.renderer.setAttribute(_activeLine, 'y1',                 this.floorLimit.toString());
      this.renderer.setAttribute(_activeLine, 'x2',                 this.rightLimit.toString());
      this.renderer.setAttribute(_activeLine, 'y2',                 this.cielLimit.toString());
      this.renderer.setAttribute(_activeLine, 'stroke',             DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(_activeLine, 'stroke-width',       '2');
      this.renderer.setAttribute(_activeLine, 'stroke-linecap',     'round');
      return _activeLine;
    };

    const activeLine = getActiveWeekLine();
    this.renderer.appendChild(this._graph, activeLine);
    this.activeWeekLine = activeLine;
    this.activePoint = getActivePoints(false);

    let pathDVal = '';

    const path = this.renderer.createElement('path', 'svg');
    const startPath = 'M';
    const lineToPath = 'L';

    this.data.weeks.forEach((w, i) => {
      const wp = getWeekPoint();

      const yPointPosition = this.cielLimit + this.floorLimit - ((w.distance / (this.data.highestWeeklyDistance - 0)) * this.floorLimit);
      const xPointPosition = (this.leftLimit + 24.1 * i);

      let prefix;

      if (i === 0) {
        prefix = startPath;
      } else {
        prefix = lineToPath;
      }
      pathDVal += `${prefix + xPointPosition} ${yPointPosition} `;
      this.renderer.setAttribute(wp, 'cx', xPointPosition.toString());
      this.renderer.setAttribute(wp, 'cy', yPointPosition.toString());
      this.weekPoints.push(wp);
    });

    this.renderer.setAttribute(path, 'stroke',            DYNAMIC_ELEMENT_COLOR);
    this.renderer.setAttribute(path, 'fill',              'none');
    this.renderer.setAttribute(path, 'stroke-width',      '2');
    this.renderer.setAttribute(path, 'stroke-linecap',    'round');
    this.renderer.setAttribute(path, 'd', pathDVal);
    this.renderer.appendChild(this._graph, path);

    const fill = this.renderer.createElement('path', 'svg');
    this.renderer.setAttribute(fill, 'stroke',            'none');
    this.renderer.setAttribute(fill, 'fill',              'url(#grad1)');
    this.renderer.setAttribute(fill, 'stroke-width',      '0');
    this.renderer.setAttribute(fill, 'd', pathDVal);
    pathDVal += `L${this.rightLimit} ${this.floorLimit} L${this.leftLimit} ${this.floorLimit} L${this.leftLimit} ${this.cielLimit}`;
    this.renderer.setAttribute(fill, 'd', pathDVal);
    this.renderer.appendChild(this._graph, fill);
    this.renderer.appendChild(this._graph, path);

    this.weekPoints.forEach(wp => this.renderer.appendChild(this._graph, wp));

    this.renderer.appendChild(this._graph, this.activePoint[0]);
    this.renderer.appendChild(this._graph, this.activePoint[1]);

    this.setActivePointPos(this.rightLimit, this.floorLimit);

  }

  private setActivePointPos(x: number, y: number) {
    this.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cx', x.toString());
      this.renderer.setAttribute(p, 'cy', y.toString());
    });
  }

  private getLeftScreenPosition() {
    return this._graph.getBoundingClientRect().left;
  }

  private moseDropped(x: number) {
    const dropped = Math.round(x / 12);
  }

  private withinBounding(x: number): boolean {
    if (x <= this.leftLimit) {
      return false;
    } else if (x >= this.rightLimit) {
      return false;
    } else {
      return true;
    }
  }

  onMove({ clientX }) {
      const newX = clientX - this.posFromLeft;
      if (this.withinBounding(newX)) {
        this.renderer.setAttribute(this.activeWeekLine, 'x1', newX.toString());
        this.renderer.setAttribute(this.activeWeekLine, 'x2', newX.toString());
        this.setActivePointPos(newX, this.floorLimit);
        const travelling = Math.round(265 - newX + this.leftLimit);
        this.weekContainerTravel = Math.round(295 * 12 / 100);

        this.weekUnit = Math.round((( newX - this.leftLimit ) / (this.rightLimit - this.leftLimit) ) * (100 - 0) + 0);
      }
  }

  onClick(e): void {
    this.onMove(e);
    this.listenGlobal();
  }

  private listenGlobal(): void {
    const killMouseMoveListen = this.renderer.listen('document', 'mousemove', e => this.onMove(e));
    const killMouseUpListen = this.renderer.listen('document', 'mouseup', e => {
      killMouseMoveListen();
      killMouseUpListen();
    });
  }

  ngAfterViewInit() {
    this.setDimensions();
    this.renderStaticContent();
    this.renderDynamicContent();
  }

}
