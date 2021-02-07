import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { ActivityGraphComponent } from "./components/activity-graph/activity-graph.component";
import { DataEditorComponent } from './components/data-editor/data-editor.component';
@NgModule({
  declarations: [AppComponent, ActivityGraphComponent, DataEditorComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
