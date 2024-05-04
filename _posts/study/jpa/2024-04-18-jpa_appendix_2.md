---
layout: post
title: "[부록 2] 연관관계 효율성[작성중]"
description: >
    JPA의 기본 사항을 정리한다.
image: /assets/img/study/jpa.jpg
categories: [study,jpa]
related_posts:
  
---
* toc
{:toc}

## OneToOne

### 효율적인 방법 : `@MapsId`를 사용하는 단방향/양방향 `@OneToOne`

* 이유 : @MapsId를 사용하면 관계가 있는 두 엔티티가 같은 식별자 값을 공유하게 된다.
* 이는 별도의 외래 키 칼럼을 생성하지 않고 기존의 식별자 필드를 재사용함으로써 데이터베이스 설계가 단순화되고, 조인 처리 시 성능이 향상된다.


```java
@Entity
public class User {
    @Id
    private Long id;

    @OneToOne
    @MapsId
    private UserProfile profile;
}

@Entity
public class UserProfile {
    @Id
    private Long id;

    @OneToOne(mappedBy = "profile")
    private User user;
}

```

User 엔티티는 자신의 id를 기본 키로 가진다.<br>
UserProfile 엔티티는 @MapsId를 사용하여 User의 id를 자신의 id로 매핑한다.<br>
즉, UserProfile의 id는 User의 id와 동일한 값을 갖게 되며, 데이터베이스에서는 이 두 테이블이 같은 기본 키 값을 공유하게 된다.
데이터베이스 설계가 간결해지고, 조인을 수행할 때 효율성이 향상되는 장점이 있다.<br><br>


> User 테이블: id (기본 키) = UserProfile 테이블: id (기본 키이자 외래 키)


### 비효율적인 방법 : @MapsId를 사용하지 않는 양방향 OneToOne
* 각 엔티티는 자체적인 식별자를 가지며 추가적으로 상대방 엔티티의 식별자를 외래 키로 관리해야 한다.
* 이로 인해 데이터 중복과 추가적인 조인 처리가 필요하게 되어 성능 저하의 원인이 된다.


```java

@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;

    @OneToOne(mappedBy = "user")
    private UserProfile profile;
}

@Entity
public class UserProfile {
    @Id
    @GeneratedValue
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;
}

```

> User 테이블: id (기본 키) <br>
> UserProfile 테이블: id (기본 키), user_id (외래 키)


---


## OneToMany

### 효율적인 양방향 OneToMany와 단방향 ManyToOne

* 주로 ManyToOne 측에 있는 엔티티가 외래 키를 관리하게 된다.
* 이는 데이터베이스에서 외래 키를 한 쪽 테이블에만 유지하므로 업데이트가 쉬워지고 데이터 무결성을 효율적으로 관리할 수 있게 된다.
* 또한, OneToMany 측에서는 단순히 ManyToOne 필드를 참조하여 관계를 설정하기 때문에 처리가 간결해진다.

```java

@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;

    @OneToMany(mappedBy = "user")
    private List<Order> orders;
}

@Entity
public class Order {
    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}

```

### 덜 효율적인 @JoinColumn(name = "foo_id", insertable = false, updatable = false)

위의 @JoinColumn(name = "user_id")를 insertable = false, updatable = false로 설정하는 경우이다.<br>
@ManyToOne에서 이미 생성된 User 객체만 Setting 할 수 있다.<br>

```java
//file: `효율적으로 JoinColumn 사용시`

User newUser = new User(); // 새 User 객체
        newUser.setName("Jane Doe");

        Order newOrder = new Order(); // 새 Order 객체
        newOrder.setItem("Book");
        newOrder.setUser(newUser); // Order 객체에 User 객체 연결

        entityManager.persist(newOrder); // Order와 User 함께 저장

```

이 경우, newOrder와 함께 newUser도 데이터베이스에 저장되고,<br>
newOrder의 user_id 외래 키는 newUser의 ID로 자동 설정된다.<br><br>

```java
//file: `insertable = false, updatable = false 사용시`
User existingUser = entityManager.find(User.class, existingId); // 기존 User 검색

        Order newOrder = new Order(); // 새 Order 객체
        newOrder.setItem("Laptop");
        newOrder.setUser(existingUser); // 기존 User 객체를 Order에 연결

        entityManager.persist(newOrder); // Order 저장

```

newOrder는 existingUser의 정보를 참조하되, newOrder를 통해 existingUser의 user_id를 변경할 수는 없다.<br><br>

### 비효율적인 Set + 단방향 @OneToMany + (@JoinColumn or @OrderColumn) 


* JoinColumn의 비효율성의 원인
  * 관계                                      에 대한 변경이 있을 때마다 해당 컬렉션의 모든 엔티티를 업데이트해야 할 필요가 있다

* OrderColumn의 비효율성의 원인
  * 컬렉션 내의 엔티티 순서가 변경되면, JPA 구현체는 관련된 모든 엔티티의 순서 인덱스를 업데이트해야 한다.
  * 엔티티를 추가하거나 제거할 때, 나머지 엔티티의 순서 인덱스를 재조정해야 하므로 데이터베이스에서 많은 업데이트 연산이 필요해진다.



### 최악인 List + 단방향 @OneToMany

* 인덱스 컬럼 관리: List와 @OrderColumn 사용 시, JPA는 컬렉션의 각 엔티티에 대해 순서를 유지하기 위한 인덱스 컬럼을 추가한다.<br>
* 동작의 영향범위가 복잡해진다. (Member - Team의 경우, Member를 지우면 Team에서는 지워지지 않는다 같이)<br>


---


## ManyToMany