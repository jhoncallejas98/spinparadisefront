import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AdminUser {
  id?: string;
  _id?: string;
  username: string;
  email: string;
  balance: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  users: AdminUser[] = [];
  constructor(private http: HttpClient) {
    this.http.get<AdminUser[]>(`${environment.apiUrl}/api/admin/users`).subscribe(data => {
      this.users = (data || []).map((u: AdminUser) => ({ ...u, id: u.id || u._id }));
    });
  }
}

