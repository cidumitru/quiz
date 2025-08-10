import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  emailForm: FormGroup;
  otpForm: FormGroup;
  
  showOtpForm = false;
  isLoading = false;
  email = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  onRequestOtp(): void {
    if (this.emailForm.valid) {
      this.isLoading = true;
      this.email = this.emailForm.value.email;

      this.authService.requestOtp(this.email).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.showOtpForm = true;
          this.snackBar.open(response.message, 'Close', { duration: 5000 });
        },
        error: (error) => {
          this.isLoading = false;
          const message = error.error?.message || 'Failed to send OTP. Please try again.';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        }
      });
    }
  }

  onVerifyOtp(): void {
    if (this.otpForm.valid) {
      this.isLoading = true;
      const code = this.otpForm.value.code;

      this.authService.verifyOtp(this.email, code).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.isLoading = false;
          const message = error.error?.message || 'Invalid or expired OTP. Please try again.';
          this.snackBar.open(message, 'Close', { duration: 5000 });
          this.otpForm.get('code')?.reset();
        }
      });
    }
  }

  onBackToEmail(): void {
    this.showOtpForm = false;
    this.otpForm.reset();
  }

  onResendOtp(): void {
    this.onRequestOtp();
  }
}