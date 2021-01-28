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
import { ActivityGraphService } from './activity-graph.service';

const CIEL_PAD = 10;
const GRID_PAD = 17;
const FLOOR_PAD = 35;

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

enum CursorFluxDirection {
  right,
  left
}

enum CloseWeekGetType {
  round,
  floor
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
  /**
   * The width in px of one week sector
   */
  weekWidth: number;

  /**
   * Y position of each Week Point. week 0 = mappedWeekData index 0
   */
  mappedWeekData: number[];

  /**
   * A number between 0 and 1 representing the cursors current position
   */
  currentNormalisedX: number;

  /**
   * Which direction the cursor is moving. Used in calculate of Y posisition of cursor point.
   */
  direction: CursorFluxDirection;

  /**
   * Used to keep graphX in memory, so cursor direction can be asserted.
   */
  graphXCache: number;

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

  private setCursorPosition(x: number) {

    const graphX = (x * this.graphInnerWidth) + GRID_PAD;
    const currentWeek = this.getCloseWeekNumber(x, CloseWeekGetType.floor);
    const currentWeekValue = this.mappedWeekData[currentWeek];
    const nextWeekValue = this.mappedWeekData[currentWeek + 1];
    /**
     * when true, cursor point will travel up graph: vice vera
     */
    const yMovingDirection = currentWeekValue >= nextWeekValue;
    const yTravelUnit = Math.abs(currentWeekValue - nextWeekValue || 0);
    const normalised = Math.floor(graphX - (this.weekWidth * currentWeek + GRID_PAD)) / this.weekWidth;


    this.dynamicGraphNodes.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cx', graphX.toString());
      this.renderer.setAttribute(p, 'cy', (yMovingDirection ?
      (currentWeekValue - (yTravelUnit * normalised))
      : (currentWeekValue + (yTravelUnit * normalised))).toString());
    });
    const activeLine = this.dynamicGraphNodes.activeLine;
    this.renderer.setAttribute(activeLine, 'x1', graphX.toString());
    this.renderer.setAttribute(activeLine, 'x2', graphX.toString());
  }

  private setWeekContainerScroll(x: number, isGraphCoordinate?: boolean): void { // todo: remove second param- just pass noramlised x
    if (!isGraphCoordinate) {
      x = x * this._weekContainer.offsetWidth * (this.getSelectedActivity().weeks.length - 1);
    }
    this._weekContainer.scrollLeft = x;
  }

  private mapWeekDataForGraph(): void {
    this.mappedWeekData = this.getSelectedActivity().weeks.map(d => this.mapWeekPoint(d.distance));
  }

  private getSelectedActivity() {
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
    const killMouseMoveListen = this.renderer.listen('document', 'mousemove', ({clientX}) => this.onMove(clientX));
    const killMouseUpListen = this.renderer.listen('document', 'mouseup', ({clientX}) => {
      this.onMouseDrop(clientX);
      killMouseMoveListen();
      killMouseUpListen();
    });
  }

  private getNewFlooredWeekNumber(normalisedX: number) {
    const closestWeek = this.getCloseWeekNumber(normalisedX, CloseWeekGetType.floor);
    const shouldEmit = this.currentWeekEmissionHelper.shouldEmit(closestWeek);

    if (shouldEmit) {
      this.currentWeek.emit(closestWeek);
      return closestWeek;
    }
  }

  private getCloseWeekNumber(normalisedX: number, type: CloseWeekGetType): number {
    return Math[CloseWeekGetType[type]](((normalisedX * this.graphInnerWidth)) /
    (this.graphInnerWidth / (this.getSelectedActivity().weeks.length - 1)));
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

  private setWeek(normalisedX: number): void {
    const newFlooredWeek = this.getNewFlooredWeekNumber(normalisedX);

    this.setWeekContainerScroll(normalisedX);
    this.setCursorPosition(normalisedX);

    if (newFlooredWeek) {
      this.setWeekContainerScroll(
        this._weekContainer.offsetWidth  * newFlooredWeek, true
      );
    }
  }

  private getNormalisedXFromClientX(clientX: number): number {
    return ((clientX - this.gridPositionFromLeftOfScreen) - GRID_PAD) / this.graphInnerWidth;
  }

  getTabClass(id: number) {
    return this.activeTab === id ? 'tabOn' : 'tabOff';
  }

  onMouseDrop(clientX: number) {
    const normalisedX = this.getNormalisedXFromClientX(clientX);
    const nearestWeekNumber = this.getCloseWeekNumber(normalisedX, CloseWeekGetType.round);

    this.setWeekContainerScroll(
      this._weekContainer.offsetWidth  * nearestWeekNumber, true
    );
    this.setCursorPosition((1 / (this.getSelectedActivity().weeks.length - 1)) * nearestWeekNumber);
  }

  onMove(clientX: number) {
    const normalisedX = this.getNormalisedXFromClientX(clientX);
    this.setWeek(normalisedX);
  }

  onClick({ clientX }): void {
    this.onMove(clientX);
    this.listenGlobal();
  }

  onSetActiveTab(tabId: number) {
    this.activeTab = tabId;
    this.mapWeekDataForGraph();
    this.updateDynamicContent();
    this.cd.detectChanges();
  }

  onTabSelect(tabId: activityType) { // todo needs tidying
    this.activeTab = tabId;
    this.mapWeekDataForGraph();
    this.updateDynamicContent();
  }

  ngOnInit() {
    this.setDimensions();
    this.initGridPathHelper();
    this.renderStaticContent();
    this.initDynamicContent();
  }

  ngAfterViewInit() {
    this.onTabSelect(0);
    this.setWeek(1);
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
