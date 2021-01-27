import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { ActivityGraphComponent } from "./components/activity-graph/activity-graph.component";
import { TabsComponent } from './components/tabs/tabs.component';
import { ToolsComponent } from './components/tools/tools.component';
import { SliderComponent } from './components/slider/slider.component';
// import { MomentModule } from "ngx-moment";
@NgModule({
  declarations: [AppComponent, ActivityGraphComponent, TabsComponent, ToolsComponent, SliderComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
