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
import { TwelveWeekData, activityType, WeekInfo } from './../../app.component';
import { map } from 'rxjs/operators';


import { ActivityGraphService } from './activity-graph.service';
import { UtilitiesService } from './../../utilities.service';
const CIEL_PAD = 10;
const GRID_PAD = 17;
const FLOOR_PAD = 45;

enum ConversionType {
  normalisedXtoGraphX,
  graphXtoNormalisedX,
  weekNumberToGraphX,
  WeekContainerToNormalisedX
}

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

  graphInnerWidth: number;
  yGraphTravel: number;
  weekContainerTravel: number;
  weekUnit: number;
  weekWidth: number;
  graphTravel: number;
  mappedWeekData: number[];
  constructor(
    private renderer: Renderer2,
    private aGraphSrv: ActivityGraphService,
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
  private currentWeekEmissionHelper = new CurrentWeekEmissionHelper();

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

    this.graphInnerWidth = graphContainerWidth - (GRID_PAD * 2);
    this.yGraphTravel = graphContainerHeight - (GRID_PAD * 2);
    this.renderer.setAttribute(this._graph, 'height', graphContainerHeight);
    this.renderer.setAttribute(this._graph, 'width', graphContainerWidth.toString());
    this.weekWidth = this.graphInnerWidth / (this.getSelectedActivity().weeks.length - 1);

    this.cielLimit = CIEL_PAD;
    this.leftLimit = GRID_PAD;
    this.floorLimit = this.graphContainer.nativeElement.offsetHeight - FLOOR_PAD;
    this.rightLimit = graphContainerWidth - GRID_PAD;
  }

  highestWeeklyDistance(): string {
    return `${this.formatKMs(this.getSelectedActivity().highestWeeklyDistance)} km`;
  }

  formatKMs(KMs: number): string {
    return (KMs / 1000).toFixed();
  }

  weeklyDistance(distance: number): string {
    return `${this.formatKMs(distance)} km`;
  }

  private renderStaticContent(): void {

    const boundingRect = this.aGraphSrv.getBoundingRectangle();

    this.renderer.setAttribute(boundingRect, 'x',        Math.round(this.leftLimit).toString());
    this.renderer.setAttribute(boundingRect, 'y',        this.cielLimit.toString());
    this.renderer.setAttribute(boundingRect, 'width',    this.graphInnerWidth.toString());
    this.renderer.setAttribute(boundingRect, 'height',   this.floorLimit.toString());
    this.renderer.appendChild(this._graph, boundingRect);

    this.getSelectedActivity().weeks.forEach((week: WeekInfo, i: number) => {

      if (![0, 11].includes(i)) { // todo: get values from weeks array /no hardcoding
        const gridLine = this.aGraphSrv.getGridLine();
        const x = this.leftLimit + (this.weekWidth * i);
        this.renderer.setAttribute(gridLine, 'x1',      Math.round(x).toString());
        this.renderer.setAttribute(gridLine, 'y1',      (this.cielLimit + this.floorLimit).toString());
        this.renderer.setAttribute(gridLine, 'x2',      Math.round(x).toString());
        this.renderer.setAttribute(gridLine, 'y2',      this.cielLimit.toString());
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
    this.renderer.setAttribute(activeLine, 'x1', Math.round(this.rightLimit).toString());
    this.renderer.setAttribute(activeLine, 'y1', (this.cielLimit + this.floorLimit).toString());
    this.renderer.setAttribute(activeLine, 'x2', Math.round(this.rightLimit).toString());
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
      this.renderer.setAttribute(wp[0], 'cx', xPointPosition.toString());
      this.renderer.setAttribute(wp[0], 'cy', yPointPosition.toString());
      this.renderer.appendChild(this._graph, wp[0]);
      return wp;
    });

  }

  private mapWeekPoint(value) {
    return this.cielLimit + (this.floorLimit) -
    ((value / (this.getSelectedActivity().highestWeeklyDistance - 0)) * this.floorLimit);
  }

  private getWeekUnitOffsets(weekNumber: number): [number, number, number] {
    const weeksLength = this.getSelectedActivity().weeks.length;
    return [
      weekNumber >= 0 ? 0 : weekNumber - 1,
      weekNumber,
      weekNumber >= weeksLength ? weeksLength : weekNumber + 1
    ];
  }

  private setCursorPosition(x: number, isGraphCoordinate?: boolean) {

    if (!isGraphCoordinate) {
      x = (x * this.graphInnerWidth) + GRID_PAD;
    }
    const y = this.floorLimit; // ! remove TIDY
    const [previousWeek, currentWeek, nextWeek] = this.getWeekUnitOffsets(this.currentWeekEmissionHelper.current);
    const a = this.mappedWeekData[currentWeek];

    this.dynamicGraphNodes.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cx', x.toString());
      this.renderer.setAttribute(p, 'cy', (this.cielLimit + y).toString());
    });
    const activeLine = this.dynamicGraphNodes.activeLine;
    this.renderer.setAttribute(activeLine, 'x1', x.toString());
    this.renderer.setAttribute(activeLine, 'x2', x.toString());
  }

  /**
   * Converts normalisedX to coordinates and checks validity within graph, returns normalisedX.
   */
  // private validateX(normalisedX: number): number {

  //   if (x < this.leftLimit) {
  //     return this.leftLimit;
  //   } else if (x > this.rightLimit) {
  //     return this.rightLimit;
  //   } else {
  //     return x;
  //   }
  // }

  private setRight(right: number): void {
    this._weekContainer.style.right = `${right}px`;

  }

  private setWeekContainerScroll(x: number, isGraphCoordinate?: boolean): void { // todo: remove second param- just pass noramlised x
    if (!isGraphCoordinate) {
      x = x * this._weekContainer.offsetWidth * (this.getSelectedActivity().weeks.length - 1);
    }
    this._weekContainer.scrollLeft = x;
  }

  onMouseDrop({clientX}) {

    const currentWeek = this.currentWeekEmissionHelper.current;
    this.setWeekContainerScroll(
      this._weekContainer.offsetWidth  * currentWeek, true
    );
    this.setCursorPosition(currentWeek * this.weekWidth + GRID_PAD, true);
  }

  onMove({ clientX }) {
    const normalisedX = ((clientX - this.gridPositionFromLeftOfScreen) - GRID_PAD) / this.graphInnerWidth;
    const newWeek = this.getCurrentlyFocusedWeek(normalisedX);

    this.setWeekContainerScroll(normalisedX);
    this.setCursorPosition(normalisedX); // todo Y!

    if (newWeek) {
      this.setWeekContainerScroll(
        this._weekContainer.offsetWidth  * newWeek, true
      );
    }
  }

  private getCurrentlyFocusedWeek(normalisedX: number) {

    const currentWeek = Math.floor(((normalisedX * this.graphInnerWidth)) /
    (this.graphInnerWidth / (this.getSelectedActivity().weeks.length - 1)));
    const shouldEmit = this.currentWeekEmissionHelper.shouldEmit(currentWeek);

    if (shouldEmit) {
      this.currentWeek.emit(currentWeek);
      console.log(currentWeek * this._weekContainer.offsetWidth, `${currentWeek} * ${this._weekContainer.offsetWidth}`);
      // this.drawCheckLine(x, currentWeek);
      return currentWeek;
    }
  }


  drawCheckLine(x, currentWeek) {
    const line = this.aGraphSrv.getGridLine(true);
    this.renderer.setAttribute(line, 'x1', x);
    this.renderer.setAttribute(line, 'y1', '100');
    this.renderer.setAttribute(line, 'x2', x);
    this.renderer.setAttribute(line, 'y2', '0');
    this.renderer.appendChild(this._graph, line);
  }

  onClick(e): void {
    this.onMove(e);
    this.listenGlobal();
  }

  mapWeekDataForGraph(): void {
    this.mappedWeekData = this.getSelectedActivity().weeks.map(d => this.mapWeekPoint(d.distance));
  }

  onTabSelect(tabId: activityType) { // todo needs tidying
    this.activeTab = tabId;
    this.mapWeekDataForGraph();
    this.updateDynamicContent();
  }

  getSelectedActivity() {
    return this.data[activityType[this.activeTab]];
  }

  private renderWeekPoint(weekPointId: number, newY: number, oldY?: number) {
    const week = this.dynamicGraphNodes.weekPoints[weekPointId][0];
    const aniWeek = this.dynamicGraphNodes.weekPoints[weekPointId][1];
    this.renderer.setAttribute(week, 'cy', newY.toString());
    if (!oldY) {
      this.renderer.setAttribute(aniWeek, 'from', this.floorLimit.toString());
    } else {
      this.renderer.setAttribute(aniWeek, 'from', oldY.toString());
    }
    this.renderer.setAttribute(aniWeek, 'to', newY.toString());
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

  private updateDynamicContent() {

    this.mappedWeekData.forEach((yPos: number, i: number) => {
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
    const killMouseUpListen = this.renderer.listen('document', 'mouseup', e => {
      this.onMouseDrop(e);
      killMouseMoveListen();
      killMouseUpListen();
    });
  }

  getTabClass(id: number) {
    return this.activeTab === id ? 'tabOn' : 'tabOff';
  }

  setActiveTab(tabId: number) {
    this.activeTab = tabId;
    this.mapWeekDataForGraph();
    this.updateDynamicContent();
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
  }

  ngAfterViewInit() {
    this.onTabSelect(0);
    this.setCursorPosition(this.leftLimit);
  }

}

class CurrentWeekEmissionHelper {
  private _current: number;

  get current() {
    return this._current ?? 0;
  }

  shouldEmit(v: number) {
    v = v + 1;
    if (v !== this._current) {
      this._current = v;

      return true;
    }
    return false;
  }
}

class GridPath {
  http: any;

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
