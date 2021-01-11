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
const GRID_PAD = 16;
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
      aGraphSrv.gridColor = GRID_COLOR;
    }
  private gridPathHelper: GridPath;
  private cielLimit: number;
  private floorLimit: number;
  private leftLimit: number;
  private rightLimit: number;

  private mappedDataCache: number[] = [];

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

  highestWeeklyDistance(): string {
    return `${this.formatKMs(this.getSelectedActivity().highestWeeklyDistance)} km`;
  }

  formatKMs(KMs: number): string {
    return (KMs / 1000).toFixed(1);
  }

  weeklyDistance(distance: number): string {
    return `${this.formatKMs(distance)} km`;
  }

  private renderStaticContent(): void {

    const boundingRect = this.aGraphSrv.getBoundingRectangle();

    this.renderer.setAttribute(boundingRect, 'x',        this.leftLimit.toString());
    this.renderer.setAttribute(boundingRect, 'y',        this.cielLimit.toString());
    this.renderer.setAttribute(boundingRect, 'width',    this.xGraphTravel.toString());
    this.renderer.setAttribute(boundingRect, 'height',   this.floorLimit.toString());
    this.renderer.appendChild(this._graph, boundingRect);

    this.getSelectedActivity().weeks.forEach((week, i: number) => {

      if (![0, 11].includes(i)) {
        const gridLine = this.aGraphSrv.getGridLine();
        const x = this.leftLimit + (this.weekWidth * i);
        this.renderer.setAttribute(gridLine, 'x1',      Math.floor(x).toString());
        this.renderer.setAttribute(gridLine, 'y1',      Math.floor(this.cielLimit + this.floorLimit).toString());
        this.renderer.setAttribute(gridLine, 'x2',      Math.floor(x).toString());
        this.renderer.setAttribute(gridLine, 'y2',      Math.floor(this.cielLimit).toString());
        this.renderer.appendChild(this._graph, gridLine);
      }

      if (week.isBeginingOfMonth) {
        const text = this.aGraphSrv.getText(week.monthShort.toUpperCase());
        this.renderer.setAttribute(text, 'x',          (this.leftLimit + this.weekWidth * i - 10).toString());
        this.renderer.setAttribute(text, 'y',          (this.floorLimit + 25).toString());

        this.renderer.appendChild(this._graph, text);
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
    const floored = this.gridPathHelper.getFloored();
    this.renderer.setAttribute(path[0], 'd', floored);
    this.renderer.appendChild(this._graph, path[0]);

    // fill
    const fill = this.aGraphSrv.getFill();
    this.dynamicGraphNodes.fill = fill;
    this.renderer.appendChild(this._graph, fill[0]);

    // week points
    this.dynamicGraphNodes.weekPoints = this.getSelectedActivity().weeks.map((_, i) => {
      const wp = this.aGraphSrv.getWeekPoint();

      const yPointPosition = this.floorLimit + this.cielLimit;
      const xPointPosition = (this.leftLimit + this.weekWidth * i);
      this.renderer.setAttribute(wp[0], 'cx', Math.floor(xPointPosition).toString());
      this.renderer.setAttribute(wp[0], 'cy', Math.floor(yPointPosition).toString());
      this.renderer.appendChild(this._graph, wp[0]);
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
    console.log('weekunit:' + v);
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
    const normalisedX = (graphX - GRID_PAD) / (this.xGraphTravel);
    console.log('normalised:' + normalisedX);
    this.setWeekUnit(normalisedX);
    this.setActivePointPos(graphX, this.floorLimit);
    // const nextWeek = currentWeek + 1 <= 12 ? currentWeek + 1 : null;
    // const lastWeek = currentWeek - 1 > 0 ? currentWeek - 1 : null;

    // this.emitChangedWeek(currentWeek);
  }

  onClick(e): void {
    this.onMove(e);
    this.listenGlobal();
  }

  mapWeekDataForGraph(): number[] {
    return this.getSelectedActivity().weeks.map(d => this.mapWeekPoint(d.distance));
  }

  onTabSelect(tabId: activityType) {
    this.activeTab = tabId;
    const mappedData = this.mapWeekDataForGraph();
    this.updateDynamicContent(mappedData, true);
  }

  getSelectedActivity() {
    return this.data[activityType[this.activeTab]];
  }

  private renderWeekPoint(weekPointId: number, newY: number, oldY?: number) {
    const week = this.dynamicGraphNodes.weekPoints[weekPointId][0];
    const aniWeek = this.dynamicGraphNodes.weekPoints[weekPointId][1];
    this.renderer.setAttribute(week, 'cy', Math.floor(newY).toString());
    if (!oldY) {
      this.renderer.setAttribute(aniWeek, 'from', Math.floor(this.floorLimit).toString());
    } else {
      this.renderer.setAttribute(aniWeek, 'from', Math.floor(oldY).toString());
    }
    this.renderer.setAttribute(aniWeek, 'to', Math.floor(newY).toString());
    aniWeek.beginElement();
  }

  private updatePath(newX: number, newY: number): void {
    this.gridPathHelper.add(newX, newY);
  }

  private renderPathAndFill(): void {
    const pathAnimation = this.dynamicGraphNodes.path[1];
    const fillAnimation = this.dynamicGraphNodes.fill[1];

    const oldPath = this.gridPathHelper.getPreviousPath();
    const currentPath = this.gridPathHelper.getCurrentPath();
    const oldFill = this.gridPathHelper.completePreviousFill();
    const currentFill = this.gridPathHelper.completeCurrentFill();

    this.renderer.setAttribute(pathAnimation, 'from', oldPath);
    this.renderer.setAttribute(pathAnimation, 'to', currentPath);

    this.renderer.setAttribute(fillAnimation, 'from', oldFill);
    this.renderer.setAttribute(fillAnimation, 'to', currentFill);
    pathAnimation.beginElement();
    fillAnimation.beginElement();
  }

  private updateDynamicContent(data: number[], reset: boolean) {

    data.forEach((yPos: number, i: number) => {

      const xPos = this.leftLimit + (this.weekWidth * i);
      this.renderWeekPoint(i, yPos, this.mappedDataCache[i]);
      this.updatePath(xPos, yPos);
      this.mappedDataCache[i] = yPos;
    });
    this.renderPathAndFill();
    this.gridPathHelper.cacheCurrentPath();
    this.gridPathHelper.clearCurrentPath();
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
    const mappedData = this.mapWeekDataForGraph();
    this.updateDynamicContent(mappedData, true);
    this.cd.detectChanges();
  }

  private initGridPathHelper() {
    this.gridPathHelper = new GridPath(
      this.leftLimit,
      this.weekWidth,
      this.cielLimit + this.floorLimit,
      this.getSelectedActivity().weeks.length,
      this.rightLimit,
      this.leftLimit
      );
  }

  ngOnInit() {
    this.setDimensions();
    this.initGridPathHelper();
    this.renderStaticContent();
    this.initDynamicContent();
    this.setActivePointPos(this.leftLimit, this.floorLimit);
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

  constructor(
    leftOffset: number,
    weekWidth: number,
    floor: number,
    points: number,
    left: number,
    right: number,
    ) {
    this.leftOffset = leftOffset;
    this.weekWidth = weekWidth;
    this.floor = floor;
    this.points = points;
    this.previousPath = this.getFloored();
    this.left = left;
    this.right = right;
  }

  private leftOffset: number;
  private weekWidth: number;
  private floor: number;
  private points: number;
  private left: number;
  private right: number;

  private path = '';
  private previousPath = '';

  public get hasPreviousPath() {
    return !!this.previousPath;
  }

  get(): string {
    const pathCopy = this.path;
    return pathCopy;
  }

  clearCurrentPath() {
    this.path = '';
  }

  cacheCurrentPath(): void {
    this.previousPath = this.path;
  }

  getPreviousPath(): string {
    return this.previousPath;
  }

  getCurrentPath(): string {
    return this.path;
  }

  getForAnimation(): [string, string] {
    return [
      this.path,
      this.previousPath || this.getFloored()
    ];
  }

  completePreviousFill(): string {
    return this.previousPath + `L${this.left} ${this.floor} L${this.right} ${this.floor}`;
  }

  completeCurrentFill(): string {
    return this.path + `L${this.left} ${this.floor} L${this.right} ${this.floor}`;
  }

  getFloored(): string {
    return Array.from({length: this.points})
    .map((v, i) => `${(i === 0 ? 'M ' : 'L ')}${(this.weekWidth * i) + this.leftOffset},${this.floor}  `).join('');
  }

  add(x: number, y: number) {
    this.path += `${this.path ? 'L ' : 'M ' }${x},${y}  `;
  }

}
