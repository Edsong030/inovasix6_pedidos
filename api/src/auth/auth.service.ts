import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string, restaurantId: string) {
    const user = await this.usersService.findByEmail(email, restaurantId);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (!user.active) throw new UnauthorizedException('Usuário inativo');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return user;
  }

  async login(email: string, password: string, restaurantSlug: string) {
    const restaurant =
      await this.usersService.findRestaurantBySlug(restaurantSlug);
    if (!restaurant) throw new UnauthorizedException('Restaurante não encontrado');

    const user = await this.validateUser(email, password, restaurant.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantSlug: restaurant.slug,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantName: restaurant.name,
        businessType: restaurant.businessType,
      },
    };
  }
}
