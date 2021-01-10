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
  Output,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef

} from '@angular/core';
import { TwelveWeekData, activityType } from './../../app.component';


import { ActivityGraphService } from './activity-graph.service';
import { UtilitiesService } from './../../utilities.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityGraphComponent implements AfterViewInit, OnInit {
  currentlyDragging = false;

  activeTab = 0;

  tabOnBorderBottomColor = DYNAMIC_ELEMENT_COLOR;

  private dynamicGraphNodes = {
    activeLine: null,
    activePoint: null,
    path: null,
    fill: null,
    weekPoints: []
  };

  xGraphTravel: number;
  yGraphTravel: number;
  weekContainerTravel: number;
  weekUnit: number;
  weekWidth: number;
  graphTravel: number;
  constructor(
    private renderer: Renderer2,
    private aGraphSrv: ActivityGraphService,
    private utils: UtilitiesService,
    private cd: ChangeDetectorRef
    ) {
      aGraphSrv.renderer = renderer;
      aGraphSrv.dynamicElementColor = DYNAMIC_ELEMENT_COLOR;
    }
  private gridPathHelper = new GridPath();
  private cielLimit: number;
  private floorLimit: number;
  private leftLimit: number;
  private rightLimit: number;

  activityType = activityType;

  private activeLine;

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
    this.weekWidth = this.xGraphTravel / (this.getSelectedActivity().weeks.length - 1);

    this.cielLimit = CIEL_PAD;
    this.leftLimit = GRID_PAD;
    this.floorLimit = this.graphContainer.nativeElement.offsetHeight - FLOOR_PAD;
    this.rightLimit = graphContainerWidth - GRID_PAD;
  }

  weeklyDistance(distance: number, highest?: boolean): string {
    if (highest) {
      distance = this.getSelectedActivity().highestWeeklyDistance;
    }
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

    this.getSelectedActivity().weeks.forEach((week, i: number) => {

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

    // active line
    const activeLine = this.aGraphSrv.getActiveWeekLine();
    this.renderer.setAttribute(activeLine, 'x1', this.rightLimit.toString());
    this.renderer.setAttribute(activeLine, 'y1', (this.cielLimit + this.floorLimit).toString());
    this.renderer.setAttribute(activeLine, 'x2', this.rightLimit.toString());
    this.renderer.setAttribute(activeLine, 'y2', this.cielLimit.toString());
    this.renderer.appendChild(this._graph, activeLine);
    this.dynamicGraphNodes.activeLine = activeLine;

    // active point
    const activePoint = this.aGraphSrv.getActivePoint();
    this.dynamicGraphNodes.activePoint = activePoint;
    this.renderer.appendChild(this._graph, activePoint[0]);
    this.renderer.appendChild(this._graph, activePoint[1]);

    // path
    const path = this.aGraphSrv.getPath();
    this.dynamicGraphNodes.path = path;
    this.renderer.appendChild(this._graph, path);

    // fill
    const fill = this.aGraphSrv.getFill();
    this.dynamicGraphNodes.fill = fill;
    this.renderer.appendChild(this._graph, fill);

    // week points
    this.dynamicGraphNodes.weekPoints = this.utils.arrayOfLength(12).map((_, i) => {
      const wp = this.aGraphSrv.getWeekPoint();

      const yPointPosition = this.floorLimit + this.cielLimit;
      const xPointPosition = (this.leftLimit + this.weekWidth * i);
      this.renderer.setAttribute(wp, 'cx', xPointPosition.toString());
      this.renderer.setAttribute(wp, 'cy', yPointPosition.toString());
      this.renderer.appendChild(this._graph, wp);
      return wp;
    });

  }

  private mapWeekPoint(value) {
    return this.cielLimit + (this.floorLimit) -
    ((value / (this.getSelectedActivity().highestWeeklyDistance - 0)) * this.floorLimit);
  }

  private setActivePointPos(x: number, y: number) {
    this.dynamicGraphNodes.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cx', x.toString());
      this.renderer.setAttribute(p, 'cy', (this.cielLimit + y).toString());
    });
    const activeLine = this.dynamicGraphNodes.activeLine;
    this.renderer.setAttribute(activeLine, 'x1', x.toString());
    this.renderer.setAttribute(activeLine, 'x2', x.toString());
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
    const v = x * (this._weekContainer.offsetWidth * (this.getSelectedActivity().weeks.length - 1));
    this._weekContainer.scrollLeft = v;
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
    this.updateDynamicContent();
  }

  getSelectedActivity() {
    return this.data[activityType[this.activeTab]];
  }

  private renderWeekPoint(weekPointId: number, newY: number) {
    const week = this.dynamicGraphNodes.weekPoints[weekPointId];
    this.renderer.setAttribute(week, 'cy', newY.toString());
  }

  private updatePath(newX: number, newY: number): void {
    this.gridPathHelper.add(newX, newY);
  }

  private renderPath(): void {
    const path = this.dynamicGraphNodes.path;
    this.renderer.setAttribute(path, 'd', null);
    this.renderer.setAttribute(path, 'd', this.gridPathHelper.get());
  }

  private completePath(): string {
    const trueFloor = this.floorLimit + this.cielLimit;
    this.gridPathHelper.finish(trueFloor, this.rightLimit, this.leftLimit);
    return this.gridPathHelper.get();
  }

  private renderFill(path: string): void {
    const fill = this.dynamicGraphNodes.fill;
    this.renderer.setAttribute(fill, 'd', null);
    this.renderer.setAttribute(fill, 'd', path);
  }

  private updateDynamicContent() {
    const mappedData = this.getSelectedActivity().weeks.map(d => this.mapWeekPoint(d.distance));

    mappedData.forEach((yPos: number, i: number) => {
      const x = this.leftLimit + (this.weekWidth * i);
      this.renderWeekPoint(i, yPos);
      this.updatePath(x, yPos);
    });
    this.renderPath();
    const completedPath = this.completePath();
    this.renderFill(completedPath);

  }

  private listenGlobal(): void {
    const killMouseMoveListen = this.renderer.listen('document', 'mousemove', e => this.onMove(e));
    const killMouseUpListen = this.renderer.listen('document', 'mouseup', _ => {
      killMouseMoveListen();
      killMouseUpListen();
    });
  }

  getTabClass(id: number) {
    return this.activeTab === id ? 'tabOn' : 'tabOff';
  }

  setActiveTab(tabId: number) {
    this.activeTab = tabId;
    this.updateDynamicContent();
    this.cd.detectChanges();
  }

  ngOnInit() {
    this.setDimensions();
    this.renderStaticContent();
    this.initDynamicContent();
    this.setActivePointPos(this.rightLimit, this.floorLimit);
  }

  ngAfterViewInit() {
    this.onTabSelect(0);
  }

}

// ! keep: implement later
// const currentWeek = Math.floor(this.xGraphTravel / (this.xGraphTravel / this.data.weeks.length - 1));
// const nextWeek = currentWeek + 1 <= 12 ? currentWeek + 1 : null;
// const lastWeek = currentWeek - 1 > 0 ? currentWeek - 1 : null;

// this.emitChangedWeek(currentWeek);

class GridPath {

  private path = '';
  private completePath = false;

  get(): string {
    if (this.completePath) {
      const pathCopy = this.path;
      this.path = '';
      this.completePath = false;
      return pathCopy;
    }
    return this.path;
  }
  add(x: number, y: number) {
    this.path += `${this.path ? 'L' : 'M' }${x} ${y}`;
  }

  finish(floorLimit: number, rightLimit: number, leftLimit: number) {
    this.completePath = true;
    this.path += `L${rightLimit} ${floorLimit} L${leftLimit} ${floorLimit}`;
  }
}
