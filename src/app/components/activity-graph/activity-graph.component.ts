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
  ChangeDetectorRef,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { TwelveWeekData, activityType, WeekInfo } from './../../app.component';
import { ActivityGraphService } from './activity-graph.service';
import { animationFrameScheduler, of, scheduled, Subject } from 'rxjs';
import { repeat, takeUntil } from 'rxjs/operators';
import { UtilitiesService } from './../../utilities.service';

const CIEL_PAD = 10;
const GRID_PAD = 17;
const FLOOR_PAD = 35;

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

  activeTab = 1;
  private previouslyActiveTab = 0;

  tabOnBorderBottomColor = DYNAMIC_ELEMENT_COLOR;

  private dynamicGraphNodes = {
    activeLine: null,
    activePoint: null,
    path: null,
    fill: null,
    weekPoints: []
  };

  dataChanges$ = new Subject<SimpleChanges>();

  /**
   * Sectors represent space between weeks. Essentially @param numberOfWeeks - 1.
   * Seems trivial, but removes the need to frequently subtract one from numberOfWeeks makes the code more readible
   */
  numberOfSectors: number;
  /**
   * Number of weeks in given data set. A week represents each point on the graph.
   * Value will update if external data source changes : * upcoming feature *
   */
  numberOfWeeks: number;

  graphInnerWidth: number;
  /**
   * The width in px of one week sector
   */
  weekWidth: number;

  /**
   * todo docs
   */
  mappedYPoints: any[] = [];

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
  animationRunning: boolean;
  currentlyActiveWeek: number;

  constructor(
    private renderer: Renderer2,
    private aGraphSrv: ActivityGraphService,
    private cd: ChangeDetectorRef,
    private utils: UtilitiesService
    ) {
      aGraphSrv.renderer = renderer;
      aGraphSrv.dynamicElementColor = DYNAMIC_ELEMENT_COLOR;
      aGraphSrv.gridColor = GRID_COLOR;
    }
  private cielLimit: number;
  private floorLimit: number;
  private leftLimit: number;
  private rightLimit: number;

  private currentAnimation$ = new Subject();

  activityType = activityType;
  tabs = [
    {
      icon: 'fa-running',
      id: 1
    },
    {
      icon: 'fa-biking',
      id: 2
    },
    {
      icon: 'fa-swimming-pool',
      id: 3
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

  private initalise(): void {

    const graphContainerWidth = this.graphContainer.nativeElement.offsetWidth;
    const graphContainerHeight = this.graphContainer.nativeElement.offsetHeight;

    this.cielLimit = CIEL_PAD;
    this.leftLimit = GRID_PAD;
    this.floorLimit = this.graphContainer.nativeElement.offsetHeight - FLOOR_PAD;
    this.rightLimit = graphContainerWidth - GRID_PAD;

    this.numberOfWeeks = (this.data as any).run.weeks.length || 0;
    this.numberOfSectors = this.numberOfWeeks ? this.numberOfWeeks - 1 : 0;
    this.mapTabsYValues();

    this.graphInnerWidth = graphContainerWidth - (GRID_PAD * 2);
    this.renderer.setAttribute(this._graph, 'height', graphContainerHeight);
    this.renderer.setAttribute(this._graph, 'width', graphContainerWidth.toString());
    this.weekWidth = this.graphInnerWidth / this.numberOfSectors;

  }

  highestWeeklyDistance(): string {
    return `${this.formatKMs(this.getActivity().highestWeeklyDistance)} km`;
  }

  formatKMs(KMs: number): string {
    return (KMs / 1000).toFixed();
  }

  weeklyDistance(distance: number): string {
    return `${this.formatKMs(distance)} km`;
  }

  private setTab(id: number, isInit?: boolean) {
    if (!isInit) {
      this.previouslyActiveTab = this.activeTab;
    }
    this.activeTab = id;
  }

  private initStaticContent(): void {

    const boundingRect = this.aGraphSrv.getBoundingRectangle();

    this.renderer.setAttribute(boundingRect, 'x',        Math.round(this.leftLimit).toString());
    this.renderer.setAttribute(boundingRect, 'y',        this.cielLimit.toString());
    this.renderer.setAttribute(boundingRect, 'width',    this.graphInnerWidth.toString());
    this.renderer.setAttribute(boundingRect, 'height',   this.floorLimit.toString());
    this.renderer.appendChild(this._graph, boundingRect);

    this.getActivity().weeks.forEach((week: WeekInfo, i: number) => {

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

    // path
    const path = this.aGraphSrv.getPath();
    this.dynamicGraphNodes.path = path;
    // this.renderer.setAttribute(path, 'd', floored);
    this.renderer.appendChild(this._graph, path);

    // fill
    const fill = this.aGraphSrv.getFill();
    this.dynamicGraphNodes.fill = fill;
    this.renderer.appendChild(this._graph, fill);

    // week points
    this.dynamicGraphNodes.weekPoints = this.getActivity().weeks.map((_, i) => {
      const wp = this.aGraphSrv.getWeekPoint();

      const yPointPosition = this.floorLimit + this.cielLimit;
      const xPointPosition = (this.leftLimit + this.weekWidth * i);
      this.renderer.setAttribute(wp, 'cx', xPointPosition.toString());
      this.renderer.setAttribute(wp, 'cy', yPointPosition.toString());
      this.renderer.appendChild(this._graph, wp);
      return wp;
    });

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

  }

  private mapWeekPoint(value, highestWeeklyDistance) {
    return this.cielLimit + (this.floorLimit) -
    ((value / highestWeeklyDistance) * this.floorLimit);
  }

  private setCursorYPosition(y: number) {
    this.dynamicGraphNodes.activePoint.forEach(p => {
      this.renderer.setAttribute(p, 'cy', y.toString());
    });
  }

  private setCursorPosition(x: number) {

    const graphX = (x * this.graphInnerWidth) + GRID_PAD;
    this.currentlyActiveWeek = this.getCloseWeekNumber(x, CloseWeekGetType.floor);
    const currentWeekValue = this.mappedYPoints[this.activeTab][this.currentlyActiveWeek];
    const nextWeekValue = this.mappedYPoints[this.activeTab][this.currentlyActiveWeek + 1];
    /**
     * when true, cursor point will travel up graph: vice vera
     */
    const yMovingDirection = currentWeekValue >= nextWeekValue;
    const yTravelUnit = Math.abs(currentWeekValue - nextWeekValue || 0);
    const normalised = Math.floor(graphX - (this.weekWidth * this.currentlyActiveWeek + GRID_PAD)) / this.weekWidth;

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
      x = x * this._weekContainer.offsetWidth * (this.getActivity().weeks.length - 1);
    }
    this._weekContainer.scrollLeft = x;
  }

  private getActivity(tabId?: number) {
    return this.data[activityType[tabId ?? this.activeTab]];
  }

  private renderWeekPoint(weekPointId: number, newY: number, oldY?: number) {
    const week = this.dynamicGraphNodes.weekPoints[weekPointId];
    this.renderer.setAttribute(week, 'cy', newY.toString());
  }

  private setPathAndFill(pathValues: number[]) {
    const pathElement = this.dynamicGraphNodes.path;
    const fillElement = this.dynamicGraphNodes.fill;
    const path = pathValues.map((p, i) => {
      const pathCommand = !i ? 'M ' : 'L ';
      return `${pathCommand} ${this.leftLimit + this.weekWidth * i}, ${p}`;
    }).join(' ');
    this.renderer.setAttribute(pathElement, 'd', path);

    const pathComplete = path + [
      `L ${this.leftLimit + (this.weekWidth * (pathValues.length - 1))}, ${this.floorLimit + this.cielLimit}`,
      `L ${this.leftLimit}, ${this.floorLimit + this.cielLimit}`
    ].join(' ');
    this.renderer.setAttribute(fillElement, 'd', pathComplete);
  }

  private updateDynamicContent() {

    const time = 1000;

    const getYTravelUnit = (a: number, b: number) => Math.abs(a - b) / 100;
    const endYPositions: number[] = this.mappedYPoints[this.activeTab];
    const startYPositions: number[] = this.mappedYPoints[this.previouslyActiveTab];
    const isIncrementer = (a, b) => a >= b;
    const startCursorYPosition = this.mappedYPoints[this.previouslyActiveTab][this.currentlyActiveWeek];
    const endCursorYPosition = this.mappedYPoints[this.activeTab][this.currentlyActiveWeek];
    const yTravelCursorUnits =  getYTravelUnit(endCursorYPosition, startCursorYPosition);
    const yTravelUnits =  [];
    const operator = [];



    startYPositions.forEach((sy, i) => {
      yTravelUnits.push(getYTravelUnit(sy, endYPositions[i]));
      operator.push(isIncrementer(sy, endYPositions[i]));
    });

    const animate = () => {

      if (this.animationRunning) {
        this.currentAnimation$.next();
      }

      this.animationRunning = true;
      let count = -1;
      scheduled(of(0), animationFrameScheduler)
      .pipe(repeat(), takeUntil(this.currentAnimation$))
      .subscribe(x => {
        count ++;
        const path = [];
        startYPositions.forEach((sy: number, i: number) => {
          const travel = yTravelUnits[i];
          const yPos = operator[i]
          ? sy - (travel * count)
          : sy + (travel * count);
          this.renderWeekPoint(i, yPos);
          path.push(yPos);
        });

        this.setPathAndFill(path);

        this.setCursorYPosition(
          isIncrementer(startCursorYPosition, endCursorYPosition)
          ? (startCursorYPosition - (yTravelCursorUnits * count))
          : (startCursorYPosition + (yTravelCursorUnits * count))
          );

        if (count === 100) {
          this.animationRunning = false;
          this.currentAnimation$.next();
        }
      });
    };
    animate();
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
    (this.graphInnerWidth / this.numberOfSectors));
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

  private mapTabsYValues() {
    const flatYPoints = this.utils.arrayOfLength(this.numberOfWeeks).map(_ => this.floorLimit + this.cielLimit);
    this.mappedYPoints.push(flatYPoints);
    ['run', 'cycle', 'swim'].forEach(actvity => {
      const activity = (this.data as any)[actvity];
      this.mappedYPoints.push((activity.weeks.map(({distance}) => this.mapWeekPoint(distance, activity.highestWeeklyDistance))));
    });
  }

  private subscribeDataChanges() {
    this.dataChanges$.subscribe(_ => this.initalise());
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
    this.setCursorPosition((1 / this.numberOfSectors * nearestWeekNumber));
  }

  onMove(clientX: number) {
    const normalisedX = this.getNormalisedXFromClientX(clientX);
    this.setWeek(normalisedX);
  }

  onClick({ clientX }): void {
    this.onMove(clientX);
    this.listenGlobal();
  }

  onSetActiveTab(tabId: number, isInit?: boolean) {
    this.setTab(tabId, isInit);
    this.updateDynamicContent();
    this.cd.detectChanges();
  }

  onTabSelect(tabId: activityType) {
    this.activeTab = tabId;
    this.updateDynamicContent();
  }

  ngOnInit() {
    this.subscribeDataChanges();
    this.initalise();
    this.initStaticContent();
    this.initDynamicContent();
  }

  ngOnChanges() {
    this.dataChanges$.next();
  }

  ngAfterViewInit() {
    this.onSetActiveTab(1, true);
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
