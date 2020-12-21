import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CryptoService } from '../utils/crypto.service';
import { DataTransferService } from '../utils/data-transfer.service';
import { HttpService } from '../utils/http.service';
import { User } from '../utils/user';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css']
})
export class VerifyComponent implements OnInit {

  currentUser : User;
  dataReady : boolean;
  sendDataObs: Observable<string>;
  reattemptDialogShow : boolean;
  disableTryAgain : boolean;
  accScanStarted : boolean;
  waitObs: Observable<boolean>;
  printMode : boolean;

  constructor( private route : ActivatedRoute,
               private router : Router,
               private httpService : HttpService,
               private cryptoService : CryptoService,
               private dataTransfer : DataTransferService ) { }

  ngOnInit(): void {
    this.dataReady = false;
    this.reattemptDialogShow = false;
    this.disableTryAgain = false;
    this.accScanStarted = false;
    this.currentUser = new User('',-1,'','','','');

    this.waitObs = new Observable( subscriber => {
      setTimeout(() => {
        subscriber.next(true);
        subscriber.complete();
      }, 5000);
    });

    this.route.params.subscribe(( data ) => {
      this.printMode = data.mode;
      var sampleData = 'U2FsdGVkX18X+uftbAFdVyy6Ot+hm42DLy9wPGepP3wdV0cPnrnNUdYCGapEBXmpE3WEv1cREdjQzNb7WUzOZxGPn+zsVe2Ah2LgEU8MnWFwWCjj7t4W036LW2h2rGcvG2pyTObay73rKWufezX+24wEGp9Cafn7yssv2uiLjld0cX0RazmGUUbZgKDAUyJe615O7f6Cyjfl2+hCkfW7Lg==X[!O';
      let parsedString = this.cryptoService.decryptQr( sampleData );

      if( parsedString == "error" ) {
        this.reattemptDialogShow = true;
      }
      else {
        const parsedData : string[] = parsedString.split( environment.delimiter ); // UPGRADE : set delimiter to custom
        this.currentUser.name = parsedData[0];
        this.currentUser.age = parseInt(parsedData[1]);
        this.currentUser.birthdate = parsedData[2];
        this.currentUser.sex = parsedData[3];
        this.currentUser.phoneNumber = parsedData[4];
        this.currentUser.address = parsedData[5];

        this.dataReady = true;
      }
    });
  }

  saveData() {
    console.log('data sent to database...');
    this.dataReady = false;
    this.sendDataObs = this.httpService.saveData(this.currentUser);
    this.sendDataObs.subscribe((response : string)=>{
      this.dataReady = true;
      this.router.navigateByUrl('/complete');
      console.log(response);
    });
  }

  printData() {
    console.log('sent data to printer...');
    this.dataReady = false;
    this.httpService.printData( this.currentUser ).subscribe((response) => {
      console.log(response);
      this.dataReady = true;
      // TODO: set timeout function here for waiting for print to complete
    }, (error) => {
      console.log('Could not connect to printer at this time...');
      throw error;
    });
  }
  
  tryAgain() {
    this.router.navigateByUrl(`/scan/${this.printMode ? 'print' : 'code'}`);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent( event ) {
    if( !this.accScanStarted ) {
      this.accScanStarted = true;
      this.disableTryAgain = true;
      this.waitObs.subscribe((data: any) => {
        this.disableTryAgain = false;
        this.accScanStarted = false;
      });
    }
  }
}
