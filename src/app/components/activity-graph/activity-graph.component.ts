// todo: refactor static / dynamic conent methods to seperate init and render methods.
// todo: use reference comparison to check for WeekOffset change

import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Renderer2,
  EventEmitter,
  Output

} from '@angular/core';
import { TwelveWeekData, activityType } from './../../app.component';

const CIEL_PAD = 10;
const GRID_PAD = 15;
const FLOOR_PAD = 35;

interface WeekWithOffset {
  lastWeek: number;
  currentWeek: number;
  nextWeek: number;
}

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

  activeTab = activityType.run;

  tabOnBorderBottomColor = DYNAMIC_ELEMENT_COLOR;

  xGraphTravel: number;
  yGraphTravel: number;
  weekContainerTravel: number;
  weekUnit: number;
  weekWidth: number;
  graphTravel: number;
  constructor(private renderer: Renderer2) {}

  private cielLimit: number;
  private floorLimit: number;
  private leftLimit: number;
  private rightLimit: number;

  private activeWeekLine;

  activeData;

  tabs = [
    {
      icon: 'fa-running',
      id: 0
    },
    {
      icon: 'fa-biking',
      id: 1
    },
    {
      icon: 'fa-swimming-pool',
      id: 2
    },
  ];

  get highestWeeklyDistance(): string {
    if (this.activeData && this.activeData.highestWeeklyDistance) {
      return `${ (this.activeData.highestWeeklyDistance / 1000).toFixed(1) } km`;
    }
  }

  private weekPoints = [];

  private _graph;
  private _weekContainer;

  @Output() currentWeek = new EventEmitter<number>();

  private _currentWeek: number;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('weekContainer', { static: true })
  set weekContainer(e) {
    this._weekContainer = e.nativeElement;
  }

  @ViewChild('graph', { static: true })
  set graph(g) {
    this._graph = g.nativeElement;
  }

  @Input() data: TwelveWeekData;

  get gridPositionFromLeftOfScreen() {
    return this.graphContainer.nativeElement.getBoundingClientRect().left;
  }

  private setDimensions(): void {

    const graphContainerWidth = this.graphContainer.nativeElement.offsetWidth;
    const graphContainerHeight = this.graphContainer.nativeElement.offsetHeight;
    this.xGraphTravel = graphContainerWidth - (GRID_PAD * 2);
    this.yGraphTravel = graphContainerHeight - (GRID_PAD * 2);
    this.renderer.setAttribute(this._graph, 'height', graphContainerHeight);
    this.renderer.setAttribute(this._graph, 'width', graphContainerWidth.toString());
    this.weekWidth = this.xGraphTravel / (this.data[activityType[this.activeTab]].weeks.length - 1);

    this.cielLimit = CIEL_PAD;
    this.leftLimit = GRID_PAD;
    this.floorLimit = this.graphContainer.nativeElement.offsetHeight - FLOOR_PAD;
    this.rightLimit = graphContainerWidth - GRID_PAD;
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
    this.renderer.setAttribute(gridOuter, 'width',    this.xGraphTravel.toString());
    this.renderer.setAttribute(gridOuter, 'height',   this.floorLimit.toString()
    );
    this.renderer.appendChild(this._graph, gridOuter);

    this.data[activityType[this.activeTab]].weeks.forEach((week, i: number) => {

      if (![0, 11].includes(i)) { // Week Line 0 and 11 are represented by the enclosing rectangle
        const line = getLine();
        const x = (this.leftLimit + (this.weekWidth * i));
        this.renderer.setAttribute(line, 'stroke',  GRID_COLOR);
        this.renderer.setAttribute(line, 'x1',      x.toString());
        this.renderer.setAttribute(line, 'y1',      (this.cielLimit + this.floorLimit).toString());
        this.renderer.setAttribute(line, 'x2',      x.toString());
        this.renderer.setAttribute(line, 'y2',      (this.cielLimit).toString());
        this.renderer.appendChild(this._graph,      line);
      }

      if (week.isBeginingOfMonth) {
        const textContainer = this.renderer.createElement('text', 'svg');
        const text = this.renderer.createText(week.monthShort.toUpperCase());
        this.renderer.appendChild(textContainer,  text);
        this.renderer.setAttribute(textContainer, 'x',          (this.leftLimit + this.weekWidth * i - 10).toString());
        this.renderer.setAttribute(textContainer, 'y',          (this.floorLimit + 25).toString());
        this.renderer.setStyle(textContainer,     'font-size',  '8px');
        this.renderer.setAttribute(textContainer, 'fill',       '#A9A9A9');
        this.renderer.appendChild(this._graph, textContainer);
      }
    });
  }

  private initDynamicContent(): void {

    const getActiveWeekPoint = () => {
      const weekPoint = this.renderer.createElement('circle', 'svg');
      this.renderer.setAttribute(weekPoint, 'r',              '3');
      this.renderer.setAttribute(weekPoint, 'fill',           'white');
      this.renderer.setAttribute(weekPoint, 'stroke',         DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(weekPoint, 'stroke-width',   '2');
      return weekPoint;
    };

    /**
     * The active point has two components, the solid orange center,
     * and a low opacity larger point directly below it
     */
    const getActivePoints = (pulseAnimation?: boolean): [any, any] => {
      const activeWeekPoint = this.renderer.createElement('circle',         'svg');
      const activeWeekPointAccent = this.renderer.createElement('circle',   'svg');
      this.renderer.setAttribute(activeWeekPoint, 'r',                      '4');
      this.renderer.setAttribute(activeWeekPoint, 'fill',                   DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(activeWeekPoint, 'id',                     'active-point');

      this.renderer.setAttribute(activeWeekPointAccent, 'fill',             DYNAMIC_ELEMENT_COLOR);
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
    };

    const getActiveWeekLine = () => { // todo: this method should only init and return activeWeekLine, coords should be set after init
      const _activeLine = this.renderer.createElement('line',       'svg');
      this.renderer.setAttribute(_activeLine, 'x1',                 this.rightLimit.toString());
      this.renderer.setAttribute(_activeLine, 'y1',                 (this.floorLimit + this.cielLimit).toString());
      this.renderer.setAttribute(_activeLine, 'x2',                 this.rightLimit.toString());
      this.renderer.setAttribute(_activeLine, 'y2',                 this.cielLimit.toString());
      this.renderer.setAttribute(_activeLine, 'stroke',             DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(_activeLine, 'stroke-width',       '2');
      this.renderer.setAttribute(_activeLine, 'stroke-linecap',     'round');
      this.renderer.setAttribute(_activeLine, 'id',                 'active-week-line');

      return _activeLine;
    };

    const activeLine = getActiveWeekLine();
    this.renderer.appendChild(this._graph, activeLine);
    this.activeWeekLine = activeLine;
    this.activePoint = getActivePoints();

    let pathDVal = '';

    const path = this.renderer.createElement('path', 'svg');
    const startPath = 'M';
    const lineToPath = 'L';

    this.activeData[activityType[this.activeTab]].weeks.forEach((w, i) => {
      const wp = getActiveWeekPoint();

      const yPointPosition = this.floorLimit;
      const xPointPosition = (this.leftLimit + this.weekWidth * i);

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

    const fill = this.renderer.createElement('path',      'svg');
    this.renderer.setAttribute(fill, 'stroke',            'none');
    this.renderer.setAttribute(fill, 'fill',              'url(#grad1)');
    this.renderer.setAttribute(fill, 'stroke-width',      '0');
    this.renderer.setAttribute(fill, 'd', pathDVal);
    pathDVal += `L${this.rightLimit} ${this.floorLimit +
      this.cielLimit} L${this.leftLimit} ${this.floorLimit + this.cielLimit} L${this.leftLimit} ${this.cielLimit}`;
    this.renderer.setAttribute(fill, 'd', pathDVal);
    this.renderer.appendChild(this._graph, fill);
    this.renderer.appendChild(this._graph, path);

    this.weekPoints.forEach(wp => this.renderer.appendChild(this._graph, wp));

    this.renderer.appendChild(this._graph, this.activePoint[0]);
    this.renderer.appendChild(this._graph, this.activePoint[1]);

    this.setActivePointPos(this.rightLimit, this.floorLimit);

  }

  private setDynamicContent() {

  }

  private mapWeekPoint(value) {
    return this.cielLimit + (this.floorLimit) -
    ((value / (this.activeData.highestWeeklyDistance - 0)) * this.floorLimit);


  }

  private setActivePointPos(x: number, y: number) {
    this.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cx', x.toString());
      this.renderer.setAttribute(p, 'cy', (this.cielLimit + y).toString());
    });
    this.renderer.setAttribute(this.activeWeekLine, 'x1', x.toString());
    this.renderer.setAttribute(this.activeWeekLine, 'x2', x.toString());
  }

  private validateX(x: number): number {
    if (x < this.leftLimit) {
      return this.leftLimit;
    } else if (x > this.rightLimit) {
      return this.rightLimit;
    } else {
      return x;
    }
  }

  private setWeekUnit(x: number): void {
    const v = x * (this._weekContainer.offsetWidth * (this.activeData.weeks.length - 1));
    this._weekContainer.scrollLeft = v;
    // console.log(v);

  }

  private emitChangedWeek(week: number) {
    if (this._currentWeek !== week) {
      this._currentWeek = week;
      this.currentWeek.emit(week);
    }
  }

  onMove({ clientX }) {
    let graphX = clientX - this.gridPositionFromLeftOfScreen;
    graphX = this.validateX(graphX);
    console.log(graphX);
    const normalisedX = (graphX - GRID_PAD) / (this.xGraphTravel);
    this.setWeekUnit(normalisedX);
    this.setActivePointPos(graphX, this.floorLimit);
  }

  onClick(e): void {
    this.onMove(e);
    this.listenGlobal();
  }

  onTabSelect(tabId: activityType) {
    this.activeTab = tabId;
    this.activeData = this.data[activityType[tabId]];
    this.updateWeekPoints();

  }

  private updateWeekPoints() {
    this.weekPoints.forEach(wp => {
      this.renderer.setAttribute
    })
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
    this.onTabSelect(0);
    this.initDynamicContent();
    this.setDynamicContent();

    this.setWeekUnit(295 * 11);
  }

}
    // const currentWeek = Math.floor(this.xGraphTravel / (this.xGraphTravel / this.data.weeks.length - 1));
    // const nextWeek = currentWeek + 1 <= 12 ? currentWeek + 1 : null;
    // const lastWeek = currentWeek - 1 > 0 ? currentWeek - 1 : null;

    // this.emitChangedWeek(currentWeek);
