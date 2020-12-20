import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Renderer2,
} from "@angular/core";
import { TwelveWeekData } from "./../../app.component";
import { UtilitiesService } from "./../../utilities.service";

const GRID_PAD = 15;

@Component({
  selector: "app-activity-graph",
  templateUrl: "./activity-graph.component.html",
  styleUrls: ["./activity-graph.component.css"],
})
export class ActivityGraphComponent implements AfterViewInit {
  constructor(
    private renderer: Renderer2,
    private utilities: UtilitiesService
  ) {}

  private cielLimit: number;
  private floorLimit: number = GRID_PAD;
  private leftLimit: number = GRID_PAD;
  private rightLimit: number;
  private weekWidth: number;

  private _graph;

  @ViewChild("graphContainer", { static: true }) graphContainer: ElementRef;

  @ViewChild("graph", { static: true })
  set graph(g) {
    this._graph = g.nativeElement;
  }

  @Input() data: TwelveWeekData;

  private setDimensions(): void {
    this.renderer.setAttribute(
      this._graph,
      "height",
      this.graphContainer.nativeElement.offsetHeight
    );
    this.renderer.setAttribute(
      this._graph,
      "width",
      this.graphContainer.nativeElement.offsetWidth
    );

    this.cielLimit = this.graphContainer.nativeElement.offsetHeight - GRID_PAD;
    this.rightLimit = this.graphContainer.nativeElement.offsetWidth - GRID_PAD;
    this.weekWidth = this.graphContainer.nativeElement.offsetWidth / 12;
  }

  private renderStaticContent(): void {
    const round = (v) => Math.round(v);

    const getLine = () => {
      const line = this.renderer.createElement("line", "svg");
      this.renderer.setAttribute(line, "stroke", "#F0F0F0");
      return line;
    };

    const topLine = getLine();
    this.renderer.setAttribute(topLine, "x1", GRID_PAD.toString());
    this.renderer.setAttribute(topLine, "y1", GRID_PAD.toString());
    this.renderer.setAttribute(topLine, "x2", this.rightLimit.toString());
    this.renderer.setAttribute(topLine, "y2", GRID_PAD.toString());
    this.renderer.appendChild(this._graph, topLine);

    this.utilities.arrayOfLength(12).forEach((i: number) => {
      const line = getLine();
      this.renderer.setAttribute(line, "stroke", "#DCDCDC");
      this.renderer.setAttribute(line, "x1", (this.weekWidth * i).toString());
      this.renderer.setAttribute(line, "y1", this.floorLimit.toString());
      this.renderer.setAttribute(line, "x2", (this.weekWidth * i).toString());
      this.renderer.setAttribute(line, "y2", this.cielLimit.toString());
      this.renderer.appendChild(this._graph, line);
    });
  }

  ngAfterViewInit() {
    this.setDimensions();
    this.renderStaticContent();
  }
}
