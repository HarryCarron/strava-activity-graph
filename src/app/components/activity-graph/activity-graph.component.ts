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
  constructor(private renderer: Renderer2) {}

  private cielLimit: number;
  private floorLimit: number = GRID_PAD;
  private leftLimit: number = GRID_PAD;
  private rightLimit: number;

  private weekPoints = [];

  private _graph;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;

  @ViewChild('graph', { static: true })
  set graph(g) {
    this._graph = g.nativeElement;
  }

  @Input() data: TwelveWeekData;

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
    this.renderer.setAttribute(gridOuter,'width',     (this.rightLimit - this.leftLimit).toString());
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
    const getActivePoints = (): [any, any] => { // todo
      const activeWeekPoint = this.renderer.createElement('circle',         'svg');
      const activeWeekPointAccent = this.renderer.createElement('circle',   'svg');
      this.renderer.setAttribute(activeWeekPoint, 'r',                      '4');
      this.renderer.setAttribute(activeWeekPoint, 'fill',                   DYNAMIC_ELEMENT_COLOR);

      this.renderer.setAttribute(activeWeekPointAccent, 'fill',             DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(activeWeekPointAccent, 'fill-opacity',     '0.3');
      this.renderer.setAttribute(activeWeekPointAccent, 'r',                      '8');
      return [activeWeekPointAccent, activeWeekPoint];
    };

    const getActiveWeekLine = () => {
      const activeLine = this.renderer.createElement('line', 'svg');
      this.renderer.setAttribute(activeLine, 'x1',                this.rightLimit.toString());
      this.renderer.setAttribute(activeLine, 'y1',                this.floorLimit.toString());
      this.renderer.setAttribute(activeLine, 'x2',                this.rightLimit.toString());
      this.renderer.setAttribute(activeLine, 'y2',                this.cielLimit.toString());
      this.renderer.setAttribute(activeLine, 'stroke',            DYNAMIC_ELEMENT_COLOR);
      this.renderer.setAttribute(activeLine, 'stroke-width',      '2');
      this.renderer.setAttribute(activeLine, 'stroke-linecap',    'round');
      return activeLine;
    };

    this.renderer.appendChild(this._graph, getActiveWeekLine());
    const [activePoint, activePointAccent] = getActivePoints();

    let pathDVal = '';

    const path = this.renderer.createElement('path', 'svg');
    const startPath = 'M';
    const lineTOPath = 'L';
    const stopPath = 'Z';

    this.data.weeks.forEach((w, i) => {
      const wp = getWeekPoint();

      const yPointPosition = this.cielLimit + this.floorLimit - ((w.distance / (this.data.highestWeeklyDistance - 0)) * this.floorLimit);
      const xPointPosition = (this.leftLimit + 24.1 * i);

      let prefix;

      if (i === 0) {
        prefix = startPath;
      } else {
        prefix = lineTOPath;
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
    this.renderer.setAttribute(fill, 'fill',              DYNAMIC_ELEMENT_COLOR);
    this.renderer.setAttribute(fill, 'fill-opacity',              '0.2');
    this.renderer.setAttribute(fill, 'stroke-width',      '0');
    this.renderer.setAttribute(fill, 'd', pathDVal);
    pathDVal += `L${this.rightLimit} ${this.floorLimit} L${this.leftLimit} ${this.floorLimit} L${this.leftLimit} ${this.cielLimit}`;
    this.renderer.setAttribute(fill, 'd', pathDVal);
    this.renderer.appendChild(this._graph, fill);
    this.renderer.appendChild(this._graph, path);

    this.weekPoints.forEach(wp => this.renderer.appendChild(this._graph, wp));

    [1, 2].forEach(i => {
      this.renderer.setAttribute(i === 1 ? activePointAccent : activePoint , 'cx', this.rightLimit.toString());
      this.renderer.setAttribute(i === 1 ? activePointAccent : activePoint, 'cy', this.floorLimit.toString());
      this.renderer.appendChild(this._graph, activePoint);
      this.renderer.appendChild(this._graph, activePointAccent);
    });

  }

  ngAfterViewInit() {
    this.setDimensions();
    this.renderStaticContent();
    this.renderDynamicContent();
  }
}
